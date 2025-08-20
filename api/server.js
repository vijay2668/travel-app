import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import axios from "axios";
import nodemailer from "nodemailer";

const app = express();
const port = process.env.PORT || 3000;

import Trip from "./models/trip.js";
import User from "./models/user.js";

app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.log("MongoDB Connection Error", err);
    process.exit(1);
  });

app.listen(port, () => {
  console.log("Server is running on port " + port);
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "vijay.rathod2668@gmail.com",
    pass: "enpwcmptsmwnjhym"
  }
});

app.get("/", (req, res) => {
  res.send("Trip Planner API");
});

app.post("/api/trips", async (req, res) => {
  try {
    const {
      tripName,
      startDate,
      endDate,
      startDay,
      endDay,
      background,
      budget = 0,
      expenses = [],
      placesToVisit = [],
      travelers = [],
      itinerary = [],
      clerkUserId,
      userData
    } = req.body;

    if (!clerkUserId) {
      return res.status(401).json({ error: "UserId is required" });
    }

    if (
      !tripName ||
      !startDate ||
      !endDate ||
      !startDay ||
      !endDay ||
      !background
    ) {
      return res.status(400).json({ error: "Missing required trip fields" });
    }

    let user = await User.findOne({ clerkUserId });
    if (!user) {
      const { email, name } = userData;
      if (!email) {
        return res.status(400).json({ error: "User email is required" });
      }

      user = new User({ clerkUserId, email, name });
      await user.save();
    }

    const trip = new Trip({
      tripName,
      startDate,
      endDate,
      startDay,
      endDay,
      background,
      host: user._id,
      travelers: [user._id, ...travelers],
      budget,
      expenses,
      placesToVisit,
      itinerary
    });

    await trip.save();
    res.status(201).json({ message: "Trip created successfully", trip });
  } catch (err) {
    console.log("Error", err);
    res.status(500).json({ error: "Failed to create trip" });
  }
});

app.get("/api/trips", async (req, res) => {
  try {
    const { clerkUserId, email } = req.query;
    if (!clerkUserId) {
      return res.status(401).json({ error: "UserId is required" });
    }

    let user = await User.findOne({ clerkUserId });
    if (!user) {
      if (!email) {
        return res.status(400).json({ error: "User email is required" });
      }
      user = new User({ clerkUserId, email: email.toString(), name: "" });
      await user.save();
    }

    const trips = await Trip.find({
      $or: [{ host: user._id }, { travelers: user._id }]
    }).populate("host travelers");

    res.status(201).json({ trips });
  } catch (err) {
    console.log("Error", err);
    res.status(500).json({ error: "Failed to fetch trips" });
  }
});

app.post("/api/send-email", async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    if (!email || !subject || !message) {
      return res
        .status(400)
        .json({ error: "Email subject and message is required" });
    }

    const mailOptions = {
      from: "vijay.rathod2668@gmail.com",
      to: email,
      text: message,
      subject
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

async function fetchWikiByCoords(lat, lng) {
  try {
    // 1) find nearest Wiki page by geosearch
    const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lng}&gsradius=10000&gslimit=1&format=json&origin=*`;
    const geoRes = await axios.get(geoUrl);
    const page = geoRes.data?.query?.geosearch?.[0];
    if (!page) return null;

    // 2) get extract and thumbnail
    const pageId = page.pageid;
    const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&pageids=${pageId}&pithumbsize=400&format=json&origin=*`;
    const pageRes = await axios.get(pageUrl);
    const pages = pageRes.data?.query?.pages;
    const first = pages && Object.values(pages)[0];
    return {
      title: first.title,
      pageId: first.pageid,
      extract: first.extract || "",
      thumbnail: first.thumbnail?.source || null,
      url: `https://en.wikipedia.org/?curid=${first.pageid}`
    };
  } catch (err) {
    // non-fatal
    return null;
  }
}

// * Add Place to Trip Endpoint *

// OSM - free version
app.post("/api/trips/:tripId/places", async (req, res) => {
  try {
    const { tripId } = req.params;
    const { placeName } = req.body;
    if (!placeName) return res.status(400).json({ error: "placeName required" });

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    // Query Nominatim
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&addressdetails=1&extratags=1&namedetails=1&limit=1`;
    const nomRes = await axios.get(nomUrl, { headers: { "User-Agent": "travel-app/1.0 (wiwek99777@ahvin.com)", "Accept-Language": "en" } } );

    const osm = nomRes.data?.[0];
    if (!osm) return res.status(400).json({ error: "Place not found via OSM" });

    const lat = parseFloat(osm.lat);
    const lng = parseFloat(osm.lon);

    // Try to get wiki info (description + photo)
    const wiki = await fetchWikiByCoords(lat, lng);

    // Build address_components array similar-ish to Google
    const address_components = [];
    if (osm.address) {
      for (const [key, value] of Object.entries(osm.address)) {
        address_components.push({
          long_name: value,
          short_name: value,
          types: [key]
        });
      }
    }
    
   // boundingbox -> [south, north, west, east] (strings). Convert to NE/SW
   let viewport = null;
    if (osm.boundingbox && osm.boundingbox.length === 4) {
      const [south, north, west, east] = osm.boundingbox.map(Number);
      viewport = {
        northeast: { lat: north || lat, lng: east || lng },
        southwest: { lat: south || lat, lng: west || lng }
      };
    } else {
      // fallback small bbox
      const delta = 0.005;
      viewport = {
        northeast: { lat: lat + delta, lng: lng + delta },
        southwest: { lat: lat - delta, lng: lng - delta }
      };
    }

    // Map extratags to phone/website/opening hours if present
    const extratags = osm.extratags || {};
    const phoneNumber = extratags.phone || extratags["contact:phone"] || extratags["telephone"] || "";
    const website = extratags.website || extratags["contact:website"] || extratags.url || null;
    // opening_hours in OSM is often a single string in the OSM format.
    const openingHoursRaw = extratags.opening_hours || null;

    // Convert opening_hours raw string into an array for `openingHours` (best-effort).
    // NOTE: a full parse requires a library; here we keep it readable for the client.
    const openingHours = openingHoursRaw ? [openingHoursRaw] : [];

    // Types: combine OSM class/type and namedetails / categories
    const types = [];
    if (osm.class) types.push(osm.class);
    if (osm.type) types.push(osm.type);
    if (osm.namedetails && osm.namedetails.type) types.push(osm.namedetails.type);

    // Photos: prefer Wikipedia thumbnail; else try Wikimedia search (not shown here)
    const photos = wiki?.thumbnail ? [wiki.thumbnail] : [];

    // briefDescription: prefer wiki extract
    const briefDescription = (wiki?.extract && wiki.extract.slice(0, 200) + '...') ||
      `Located in ${osm.address?.city || osm.address?.town || osm.address?.village || osm.address?.county || "this area"}. A nice place to visit.`;

     // Construct placeData so it matches (as-close-as-possible) your Google shape
    const placeData = {
      name: osm.namedetails?.name || osm.display_name.split(",")[0] || placeName,
      phoneNumber,
      website,
      openingHours,
      photos,
      reviews: [], // no free, consistent review source — see notes below
      types,
      formatted_address: osm.display_name || "No address available",
      briefDescription,
      geometry: {
        location: { lat: lat || 0, lng: lng || 0 },
        viewport
      }
    };

    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      { $push: { placesToVisit: placeData } },
      { new: true }
    );

    res.status(200).json({ message: "Place added successfully", trip: updatedTrip });
    
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ error: "Failed to add place to trip" });
  }
});

// Google - paid version
// app.post('/api/trips/:tripId/places', async (req, res) => {
//   try {
//     const { tripId } = req.params;
//     const { placeId } = req.body;
//     const API_KEY = 'abc';
//     if (!placeId) {
//       return res.status(400).json({ error: 'Place ID is required' });
//     }

//     const trip = await Trip.findById(tripId);
//     if (!trip) {
//       return res.status(404).json({ error: 'Trip not found' });
//     }

//     const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${API_KEY}`;
//     const response = await axios.get(url);
//     const { status, result: details } = response.data;

//     if (status !== 'OK' || !details) {
//       return res.status(400).json({ error: `Google Places API error: ${status}` });
//     }

//     const placeData = {
//       name: details.name || 'Unknown Place',
//       phoneNumber: details.formatted_phone_number || '',
//       website: details.website || '',
//       openingHours: details.opening_hours?.weekday_text || [],
//       photos: details.photos?.map(
//         photo => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${API_KEY}`
//       ) || [],
//       reviews: details.reviews?.map(review => ({
//         authorName: review.author_name || 'Unknown',
//         rating: review.rating || 0,
//         text: review.text || '',
//       })) || [],
//       types: details.types || [],
//       formatted_address: details.formatted_address || 'No address available',
//       briefDescription:
//         details?.editorial_summary?.overview?.slice(0, 200) + "..." ||
//         details?.reviews?.[0]?.text?.slice(0, 200) + "..." ||
//         `Located in ${details.address_components?.[2]?.long_name || details.formatted_address || "this area"}. A nice place to visit.`,
//       geometry: {
//         location: {
//           lat: details.geometry?.location?.lat || 0,
//           lng: details.geometry?.location?.lng || 0,
//         },
//         viewport: {
//           northeast: {
//             lat: details.geometry?.viewport?.northeast?.lat || 0,
//             lng: details.geometry?.viewport?.northeast?.lng || 0,
//           },
//           southwest: {
//             lat: details.geometry?.viewport?.southwest?.lat || 0,
//             lng: details.geometry?.viewport?.southwest?.lng || 0,
//           },
//         },
//       },
//     };

//     const updatedTrip = await Trip.findByIdAndUpdate(
//       tripId,
//       { $push: { placesToVisit: placeData } },
//       { new: true }
//     );

//     res.status(200).json({ message: 'Place added successfully', trip: updatedTrip });
//   } catch (error) {
//     console.error('Error adding place to trip:', error);
//     res.status(500).json({ error: 'Failed to add place to trip' });
//   }
// });

// * Find trip by tripId *

app.get("/api/trips/:tripId", async (req, res) => {
  try {
    const { tripId } = req.params;
    const { clerkUserId } = req.query;
    if (!clerkUserId) return res.status(401).json({ error: "UserId is required" });

    let user = await User.findOne({ clerkUserId });
    if (!user) return res.status(400).json({ error: "User not found" });
    
    const trip = await Trip.findById(tripId).populate('host travelers');
    if (!trip) return res.status(404).json({ error: "No trip found" });

    res.status(200).json({ trip });
  } catch (err) {
    console.log("Error", err);
    res.status(500).json({ error: "Failed to fetch trips" });
  }
});

// * Add Place to Itinerary Endpoint *

// OSM - free version
app.post("/api/trips/:tripId/itinerary", async (req, res) => {
  try {
    const { tripId } = req.params;
    const { placeName, date, placeData } = req.body;

    if(!date) return res.status(400).json({ error: "Date is req" });
    
    if(!placeName && !placeData) return res.status(400).json({ error: "Either placeName or placeData is required" });
    
    const trip = await  Trip.findById(tripId);
    if(!trip) return res.status(400).json({ error: "Trip not found" });

    let activityData;

    if(placeData) {
      activityData = {
        date,
        name: placeData.name || "Unknown place",
        phoneNumber: placeData.phoneNumber || "",
        website: placeData.website || "",
        openingHours: placeData.openingHours || [],
        photos: placeData.photos || [],
        reviews: placeData.reviews || [],
        types: placeData.types || [],
        formatted_address: placeData.formatted_address || "No address available",
        briefDescription: placeData.briefDescription || "No description available",
        geometry: placeData.geometry || {
          location: { lat: 0, lng: 0 },
          viewport: {
            northeast: { lat: 0, lng: 0 },
            southwest: { lat: 0, lng: 0 },
          }
        },
      }
    } else {
      // Query Nominatim
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&addressdetails=1&extratags=1&namedetails=1&limit=1`;
      const nomRes = await axios.get(nomUrl, { headers: { "User-Agent": "travel-app/1.0 (wiwek99777@ahvin.com)", "Accept-Language": "en" } } );

      const osm = nomRes.data?.[0];
      if (!osm) return res.status(400).json({ error: "Place not found via OSM" });

      const lat = parseFloat(osm.lat);
      const lng = parseFloat(osm.lon);

      // Try to get wiki info (description + photo)
      const wiki = await fetchWikiByCoords(lat, lng);

      // Build address_components array similar-ish to Google
      const address_components = [];
      if (osm.address) {
        for (const [key, value] of Object.entries(osm.address)) {
          address_components.push({
            long_name: value,
            short_name: value,
            types: [key]
          });
        }
      }
      
      // boundingbox -> [south, north, west, east] (strings). Convert to NE/SW
      let viewport = null;
        if (osm.boundingbox && osm.boundingbox.length === 4) {
          const [south, north, west, east] = osm.boundingbox.map(Number);
          viewport = {
            northeast: { lat: north || lat, lng: east || lng },
            southwest: { lat: south || lat, lng: west || lng }
          };
        } else {
          // fallback small bbox
          const delta = 0.005;
          viewport = {
            northeast: { lat: lat + delta, lng: lng + delta },
            southwest: { lat: lat - delta, lng: lng - delta }
          };
        }

      // Map extratags to phone/website/opening hours if present
      const extratags = osm.extratags || {};
      const phoneNumber = extratags.phone || extratags["contact:phone"] || extratags["telephone"] || "";
      const website = extratags.website || extratags["contact:website"] || extratags.url || null;
      // opening_hours in OSM is often a single string in the OSM format.
      const openingHoursRaw = extratags.opening_hours || null;

      // Convert opening_hours raw string into an array for `openingHours` (best-effort).
      // NOTE: a full parse requires a library; here we keep it readable for the client.
      const openingHours = openingHoursRaw ? [openingHoursRaw] : [];

      // Types: combine OSM class/type and namedetails / categories
      const types = [];
      if (osm.class) types.push(osm.class);
      if (osm.type) types.push(osm.type);
      if (osm.namedetails && osm.namedetails.type) types.push(osm.namedetails.type);

      // Photos: prefer Wikipedia thumbnail; else try Wikimedia search (not shown here)
      const photos = wiki?.thumbnail ? [wiki.thumbnail] : [];

      // briefDescription: prefer wiki extract
      const briefDescription = (wiki?.extract && wiki.extract.slice(0, 200) + '...') ||
        `Located in ${osm.address?.city || osm.address?.town || osm.address?.village || osm.address?.county || "this area"}. A nice place to visit.`;

      activityData = {
        date,
        name: osm.namedetails?.name || osm.display_name.split(",")[0] || placeName,
        phoneNumber,
        website,
        openingHours,
        photos,
        reviews: [], // no free, consistent review source — see notes below
        types,
        formatted_address: osm.display_name || "No address available",
        briefDescription,
        geometry: {
          location: { lat: lat || 0, lng: lng || 0 },
          viewport
        }
      }
    }


    const existingItinerary = trip.itinerary.find((item) => item.date == date);
    let updatedTrip;
    if(existingItinerary) {
      updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        { $push: { "itinerary.$[elem].activities": activityData } },
        { arrayFilters: [{"elem.date": date}], new: true }
      );
    } else {
      updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        { $push: { itinerary: { date, activities: [activityData] } } },
        { new: true }
      );
    }


    res.status(200).json({ message: "Activity added to itinerary successfully", trip: updatedTrip });
  } catch (error) {
    console.log("Error adding itinerary")
    res.status(500).json({ error: "Failed to add itinerary" });
  }
})

// Google - paid version
// app.post('/api/trips/:tripId/itinerary', async (req, res) => {
//   try {
//     const { tripId } = req.params;
//     const { placeId, date, placeData } = req.body;
//     const API_KEY = 'abc';

//     if (!date) {
//       return res.status(400).json({ error: 'Date is required' });
//     }
//     if (!placeId && !placeData) {
//       return res.status(400).json({ error: 'Either placeId or placeData is required' });
//     }

//     const trip = await Trip.findById(tripId);
//     if (!trip) {
//       return res.status(404).json({ error: 'Trip not found' });
//     }

//     let activityData;

//     if (placeData) {
//       activityData = {
//         date,
//         name: placeData.name || 'Unknown Place',
//         phoneNumber: placeData.phoneNumber || '',
//         website: placeData.website || '',
//         openingHours: placeData.openingHours || [],
//         photos: placeData.photos || [],
//         reviews: placeData.reviews || [],
//         types: placeData.types || [],
//         formatted_address: placeData.formatted_address || 'No address available',
//         briefDescription: placeData.briefDescription || 'No description available',
//         geometry: placeData.geometry || {
//           location: { lat: 0, lng: 0 },
//           viewport: {
//             northeast: { lat: 0, lng: 0 },
//             southwest: { lat: 0, lng: 0 },
//           },
//         },
//       };
//     } else {
//       const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${API_KEY}`;
//       const response = await axios.get(url);
//       const { status, result: details } = response.data;

//       if (status !== 'OK' || !details) {
//         return res.status(400).json({ error: `Google Places API error: ${status}` });
//       }

//       activityData = {
//         date,
//         name: details.name || 'Unknown Place',
//         phoneNumber: details.formatted_phone_number || '',
//         website: details.website || '',
//         openingHours: details.opening_hours?.weekday_text || [],
//         photos: details.photos?.map(
//           photo => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${API_KEY}`
//         ) || [],
//         reviews: details.reviews?.map(review => ({
//           authorName: review.author_name || 'Unknown',
//           rating: review.rating || 0,
//           text: review.text || '',
//         })) || [],
//         types: details.types || [],
//         formatted_address: details.formatted_address || 'No address available',
//         briefDescription:
//           details?.editorial_summary?.overview?.slice(0, 200) + "..." ||
//           details?.reviews?.[0]?.text?.slice(0, 200) + "..." ||
//           `Located in ${details.address_components?.[2]?.long_name || details.formatted_address || "this area"}. A nice place to visit.`,
//         geometry: {
//           location: {
//             lat: details.geometry?.location?.lat || 0,
//             lng: details.geometry?.location?.lng || 0,
//           },
//           viewport: {
//             northeast: {
//               lat: details.geometry?.viewport?.northeast?.lat || 0,
//               lng: details.geometry?.viewport?.northeast?.lng || 0,
//             },
//             southwest: {
//               lat: details.geometry?.viewport?.southwest?.lat || 0,
//               lng: details.geometry?.viewport?.southwest?.lng || 0,
//             },
//           },
//         },
//       };
//     }

//     const existingItinerary = trip.itinerary.find(item => item.date === date);
//     let updatedTrip;
//     if (existingItinerary) {
//       updatedTrip = await Trip.findByIdAndUpdate(
//         tripId,
//         { $push: { 'itinerary.$[elem].activities': activityData } },
//         { arrayFilters: [{ 'elem.date': date }], new: true }
//       );
//     } else {
//       updatedTrip = await Trip.findByIdAndUpdate(
//         tripId,
//         { $push: { itinerary: { date, activities: [activityData] } } },
//         { new: true }
//       );
//     }

//     res.status(200).json({ message: 'Activity added to itinerary successfully', trip: updatedTrip });
//   } catch (error) {
//     console.error('Error adding activity to itinerary:', error);
//     res.status(500).json({ error: 'Failed to add activity to itinerary' });
//   }
// });

// * Fetch details of Place by placeName endpoint *
// OSM - free version
app.get("/api/place/details", async (req, res) => {
  try {
    const { placeName } = req.query;
    if (!placeName) return res.status(400).json({ error: "placeName required" });

    // Query Nominatim
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&addressdetails=1&extratags=1&namedetails=1&limit=1`;
    const nomRes = await axios.get(nomUrl, { headers: { "User-Agent": "travel-app/1.0 (wiwek99777@ahvin.com)", "Accept-Language": "en" } } );

    
    const osm = nomRes.data?.[0];
    if (!osm) return res.status(400).json({ error: "Place not found via OSM" });
    const lat = parseFloat(osm.lat);
    const lng = parseFloat(osm.lon);

    // Try to get wiki info (description + photo)
    const wiki = await fetchWikiByCoords(lat, lng);

    // Build address_components array similar-ish to Google
    const address_components = [];
    if (osm.address) {
      for (const [key, value] of Object.entries(osm.address)) {
        address_components.push({
          long_name: value,
          short_name: value,
          types: [key]
        });
      }
    }
    
   // boundingbox -> [south, north, west, east] (strings). Convert to NE/SW
   let viewport = null;
    if (osm.boundingbox && osm.boundingbox.length === 4) {
      const [south, north, west, east] = osm.boundingbox.map(Number);
      viewport = {
        northeast: { lat: north || lat, lng: east || lng },
        southwest: { lat: south || lat, lng: west || lng }
      };
    } else {
      // fallback small bbox
      const delta = 0.005;
      viewport = {
        northeast: { lat: lat + delta, lng: lng + delta },
        southwest: { lat: lat - delta, lng: lng - delta }
      };
    }

    // Map extratags to phone/website/opening hours if present
    const extratags = osm.extratags || {};
    const phoneNumber = extratags.phone || extratags["contact:phone"] || extratags["telephone"] || "";
    const website = extratags.website || extratags["contact:website"] || extratags.url || null;
    // opening_hours in OSM is often a single string in the OSM format.
    const openingHoursRaw = extratags.opening_hours || null;

    // Convert opening_hours raw string into an array for `openingHours` (best-effort).
    // NOTE: a full parse requires a library; here we keep it readable for the client.
    const openingHours = openingHoursRaw ? [openingHoursRaw] : [];

    // Types: combine OSM class/type and namedetails / categories
    const types = [];
    if (osm.class) types.push(osm.class);
    if (osm.type) types.push(osm.type);
    if (osm.namedetails && osm.namedetails.type) types.push(osm.namedetails.type);

    // Photos: prefer Wikipedia thumbnail; else try Wikimedia search (not shown here)
    const photos = wiki?.thumbnail ? [wiki.thumbnail] : [];

    // briefDescription: prefer wiki extract
    const briefDescription = (wiki?.extract && wiki.extract.slice(0, 200) + '...') ||
      `Located in ${osm.address?.city || osm.address?.town || osm.address?.village || osm.address?.county || "this area"}. A nice place to visit.`;


      
     // Construct placeWithDetails so it matches (as-close-as-possible) your Google shape
    const placeWithDetails = {
      name: osm.namedetails?.name || osm.display_name.split(",")[0] || placeName,
      phoneNumber,
      website,
      openingHours,
      photos,
      reviews: [], // no free, consistent review source — see notes below
      types,
      formatted_address: osm.display_name || "No address available",
      briefDescription,
      geometry: {
        location: { lat: lat || 0, lng: lng || 0 },
        viewport
      }
    };

    res.status(200).json({ message: "Fetched Place details successfully", placeWithDetails });
    } catch (error) {
    console.log("Error fetching place details")
    res.status(500).json({ error: "Failed to fetch place details" });
  }
})