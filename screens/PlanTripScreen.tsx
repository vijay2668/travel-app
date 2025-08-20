import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import React, { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Modal from "react-native-modal";
import OSMPlacesAutocomplete from "../components/OSMPlacesAutocomplete";
import axios from "axios";
import { HomeStackParamList } from "../navigation/HomeStack";
// import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

type PlanTripScreenNavigationProp =
  NativeStackNavigationProp<HomeStackParamList>;

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: string;
  price: number;
  paidBy: string;
  splitOption: string;
  date: string;
}

const PlanTripScreen = () => {
  const navigation = useNavigation<PlanTripScreenNavigationProp>();
  const route = useRoute<RouteProp<HomeStackParamList, "PlanTrip">>();
  const { trip: initialTrip } = route.params || {};
  const [trip, setTrip] = useState(initialTrip || {});
  const [showNotes, setShowNotes] = useState(true);
  const [showPlaces, setShowPlaces] = useState(true);
  const [selectedTab, setSelectedTab] = useState("Overview");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<
    "place" | "expense" | "editExpense" | "ai"
  >("place");
  const [activePlace, setActivePlace] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [error, setError] = useState<string | null>("");
  const { user } = useUser();
  const { getToken } = useAuth();

  // expenses states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingExpenses, setEditingExpenses] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState<Expense>({
    description: "",
    category: "",
    amount: "",
    paidBy: "Vijay Singh",
    splitOption: "Don't Split",
    id: "",
    price: 0,
    date: ""
  });

  // console.log("Data:", route);

  const categories = [
    "Flight",
    "Lodging",
    "Shopping",
    "Activities",
    "Sightseeing",
    "Drinks",
    "Food",
    "Transportation",
    "Entertainment",
    "Miscellaneous"
  ];

  const splitOptions = [
    { label: "Don't Split", value: "Don't Split" },
    { label: "Everyone", value: "Everyone" }
  ];

  const getCurrentDayHours = (openingHours: string[]) => {
    if (!openingHours || openingHours.length === 0) return "Hours unavailable";
    const today = dayjs().format("dddd").toLowerCase();
    const todayHours = openingHours.find((line) =>
      line.toLowerCase().startsWith(today)
    );

    return todayHours || openingHours[0];
  };

  const getAverageRating = (reviews: any[]): number | 0 => {
    if (!reviews || reviews.length == 0) return 0;
    const total = reviews.reduce(
      (sum, review) => sum + (review.rating || 0),
      0
    );
    return Number((total / reviews.length).toFixed(1));
  };

  const renderStar = (rating: number) => {
    const stars: any = [];
    const fullStarts = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStarts) {
        stars.push(
          <Ionicons key={i} name="star" size={14} color={"#FFD700"} />
        );
      } else if (i == fullStarts && halfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color={"#FFD700"} />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color={"#FFD700"} />
        );
      }
    }

    return stars;
  };

  const renderPlaceTypes = (types: string[]) => {
    const allowedTypes = [
      "rv-park",
      "tourist_attraction",
      "lodging",
      "point_of_interest",
      "establishment"
    ];
    const filteredTypes =
      types?.filter((type) => allowedTypes.includes(type)) || [];
    const typeColors: Record<string, string> = {
      rv_park: "text-green-600",
      tourist_attraction: "text-blue-600",
      lodging: "text-purple-600",
      point_of_interest: "text-orange-600",
      establishment: "text-gray-600"
    };

    return filteredTypes.map((type, index) => (
      <View
        key={index}
        className="bg-gray-300 px-3 py-1 rounded-full mr-2 mb-1"
      >
        <Text
          className={`text-sm font-medium ${typeColors[type] || "text-gray-700"} capitalize`}
        >
          {type.replace(/_/g, " ")}
        </Text>
      </View>
    ));
  };

  const renderPlaceCard = (place: any, index: number, check = false) => {
    const isActive = activePlace?.name == place?.name;

    return (
      <View
        key={index}
        className="mb-4 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
      >
        <TouchableOpacity
          onPress={() => setActivePlace(isActive ? null : place)}
          className="flex-row items-center"
        >
          <Image
            className="w-24 h-24 rounded-l-xl"
            source={{ uri: place?.photos[0] }}
          />

          <View className=" flex-1 p-3">
            <Text className="text-gray-600 font-bold text-base mb-1">
              {place.name}
            </Text>
            <Text className="text-gray-600 text-sm leading-5" numberOfLines={2}>
              {place.briefDescription || "No description available"}
            </Text>
            <View className="flex-row items-center mt-1">
              {renderStar(getAverageRating(place.reviews))}
              <Text className="text-xs text-gray-500 ml-1">
                ({getAverageRating(place.reviews)}/5)
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isActive && (
          <View className="p-4 bg-gray-50 border-t border-gray-200">
            <View className="mb-4">
              <View className="flex-row items-center">
                <Ionicons name="location" size={16} color="4B5563" />
                <Text className="text-sm font-semibold text-gray-700 ml-1">
                  Address
                </Text>
              </View>
              <Text className="text-sm text-gray-600 mt-1">
                {place.formatted_address}
              </Text>
            </View>

            {place.openingHours?.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="time" size={16} color="#4B5563" />
                </View>
                <Text className="text-sm text-gray-600 mt-1">
                  {getCurrentDayHours(place.openingHours)}
                </Text>
              </View>
            )}

            {place.phoneNumber && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="call" size={16} color="#4B5563" />
                  <Text className="text-sm font-semibold text-gray-700 ml-1">
                    Phone
                  </Text>
                </View>
                <Text className="text-sm text-gray-600 mt-1">
                  {place.phoneNumber}
                </Text>
              </View>
            )}

            {place.website && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="globe" size={16} color="#4B5563" />
                  <Text className="text-sm font-semibold text-gray-700 ml-1">
                    Website
                  </Text>
                </View>
                <Text
                  className="text-sm text-blue-500 underline mt-1"
                  numberOfLines={2}
                >
                  {place.website}
                </Text>
              </View>
            )}

            {place.reviews?.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="star" size={16} color="#4B5563" />
                  <Text className="text-sm font-semibold text-gray-700 ml-1">
                    Review
                  </Text>
                </View>
                <Text className="text-sm text-gray-600 italic mt-1">
                  "{place.reviews[0].text.slice(0, 100)}
                  {place.reviews[0].text.length > 100 ? "..." : ""}"
                </Text>
                <View className="flex-row items-center mt-1">
                  {renderStar(place.reviews[0].rating)}
                  <Text className="text-xs text-gray-500 ml-1">
                    - {place.reviews[0].authorName} ({place.reviews[0].rating}
                    /5)
                  </Text>
                </View>
              </View>
            )}

            {place.types?.length > 0 && (
              <View>
                <View className="flex-row items-center">
                  <Ionicons name="pricetag" size={16} color="#4B5563" />
                  <Text className="text-sm font-semibold text-gray-700 ml-1">
                    Categories
                  </Text>
                </View>
                <View className="flex-row flex-wrap mt-1">
                  {renderPlaceTypes(place.types)}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const generateTripDates = () => {
    const start = dayjs(trip.startDate || new Date());
    const end = dayjs(trip.endDate || new Date());
    const days = [];

    for (let d = start; d.isBefore(end) || d.isSame(end); d = d.add(1, "day")) {
      days.push(d);
    }

    return days.map((d) => ({
      label: d.format("ddd D/M"),
      value: d.format("YYYY-MM-DD")
    }));
  };

  const [AILoading, setAILoading] = useState(false);
  const [aiPlaces, setAiPlaces] = useState<any>([]);

  // Fetch AI places for Itinerary
  // OSM - free version using build api from server
  const fetchAIPlaces = async () => {
    setAILoading(true);
    setError(null);

    try {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          model: "gemini-2.0-flash",
          messages: [
            {
              role: "system",
              content: `You are a travel assistant for ${trip.tripName || "a popular destination"}. Return a JSON array of 5 objects, each representing a top place to visit. Each object must have exactly these fields: "name" (string), "description" (string, 50-100 words), "address" (string). Ensure the response is valid JSON, with no backticks, markdown, or extra text. Example: [{"name":"Place 1","description":"A beautiful place...","address":"123 Main St"}]`
            },
            {
              role: "user",
              content: `List 5 top places to visit in ${
                trip.tripName || "a popular destination"
              } in JSON format.`
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      let content = response.data.choices[0].message.content.trim();
      content = content.replace(/```json\n?|\n?```/g, "");
      const jsonMatch = content.match(/\[.*\]/s);
      if (!jsonMatch) {
        throw new Error("No valid JSON Array found");
      }

      content = jsonMatch[0];

      let places;
      try {
        places = JSON.parse(content);
      } catch (err) {
        console.log("Error parsing the content", err);
      }

      if (!Array.isArray(places) || places.length == 0) {
        throw new Error(
          "AI response missing required fields (name, description, address)"
        );
      }

      const placesWithDetails = await Promise.all(
        places.map(async (place: any) => {
          try {
            const placeName = place.name;
            const response = await axios.get(
              process.env.EXPO_PUBLIC_BACKEND_URL + "/place/details",
              { params: { placeName } }
            );

            const placeWithDetails = response.data.placeWithDetails;
            console.log("placeWithDetails", placeWithDetails);

            if (!placeWithDetails) {
              throw new Error(`No details found for ${place.name}`);
            }

            return {
              id: `ai-${place.name.replace(/\s/g, "-").toLowerCase()}`,
              placeWithDetails
            };
          } catch (err: any) {
            console.log(
              `Failed to fetch details for ${place?.name}`,
              err.message
            );

            return {
              id: `ai-${place.name.replace(/\s/g, "-").toLowerCase()}`,
              name: place.name,
              briefDescription: place.description,
              formatted_address: place.address,
              photos: ["https://via.placeholder.com/150"],
              types: ["point_of_interest"],
              openingHours: [],
              phoneNumber: "",
              website: "",
              geometry: {
                location: { lat: 0, lng: 0 },
                viewport: {
                  northeast: { lat: 0, lng: 0 },
                  southwest: { lat: 0, lng: 0 }
                }
              },
              reviews: []
            };
          }
        })
      );

      setAiPlaces(placesWithDetails);
      setModalMode("ai");
      setModalVisible(true);
    } catch (err: any) {
      console.error("Error fetching AI places:", err.message);
      setError(`Failed to fetch AI recommendations: ${err.message}`);
      setAiPlaces([
        {
          id: "ai-fallback-1",
          name: "Placeholder Attraction",
          briefDescription: "A popular place to visit in this destination.",
          formatted_address: "Unknown Address",
          photos: ["https://via.placeholder.com/150"],
          types: ["point_of_interest"],
          openingHours: [],
          phoneNumber: "",
          website: "",
          geometry: {
            location: { lat: 0, lng: 0 },
            viewport: {
              northeast: { lat: 0, lng: 0 },
              southwest: { lat: 0, lng: 0 }
            }
          },
          reviews: []
        }
      ]);
      setModalMode("ai");
      setModalVisible(true);
    } finally {
      setAILoading(false);
    }
  };

  // Google - paid version
  // const fetchAIPlaces = async () => {
  //   setAILoading(true);
  //   setError(null);
  //   try {
  //     const response = await axios.post(
  //       "https://api.openai.com/v1/chat/completions",
  //       {
  //         model: "gpt-4o",
  //         messages: [
  //           {
  //             role: "system",
  //             content: `You are a travel assistant for ${
  //               trip.tripName || "a popular destination"
  //             }. Return a JSON array of 5 objects, each representing a top place to visit. Each object must have exactly these fields: "name" (string), "description" (string, 50-100 words), "address" (string). Ensure the response is valid JSON, with no backticks, markdown, or extra text. Example: [{"name":"Place 1","description":"A beautiful place...","address":"123 Main St"}]`
  //           },
  //           {
  //             role: "user",
  //             content: `List 5 top places to visit in ${
  //               trip.tripName || "a popular destination"
  //             } in JSON format.`
  //           }
  //         ]
  //       },
  //       {
  //         headers: {
  //           Authorization: `Bearer token`,
  //           "Content-Type": "application/json"
  //         }
  //       }
  //     );

  //     let content = response.data.choices[0].message.content.trim();
  //     content = content.replace(/```json\n?|\n?```/g, "");
  //     const jsonMatch = content.match(/\[.*\]/s);
  //     if (!jsonMatch) {
  //       throw new Error("No valid JSON array found in response");
  //     }
  //     content = jsonMatch[0];

  //     let places;
  //     try {
  //       places = JSON.parse(content);
  //     } catch (parseError) {
  //       console.error("JSON Parse error:", parseError);
  //       throw new Error("Invalid JSON format in AI response");
  //     }

  //     if (!Array.isArray(places) || places.length === 0) {
  //       throw new Error("AI response is not a valid array");
  //     }
  //     places.forEach((place) => {
  //       if (!place.name || !place.description || !place.address) {
  //         throw new Error(
  //           "AI response missing required fields (name, description, address)"
  //         );
  //       }
  //     });

  //     const placesWithDetails = await Promise.all(
  //       places.map(async (place: any) => {
  //         try {
  //           const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
  //             `${place.name}, ${place.address}`
  //           )}&inputtype=textquery&fields=place_id&key=${GOOGLE_API_KEY}`;
  //           const findPlaceRes = await axios.get(findPlaceUrl);
  //           const placeId = findPlaceRes.data.candidates?.[0]?.place_id;

  //           if (!placeId) {
  //             throw new Error(`No place_id found for ${place.name}`);
  //           }

  //           const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,photos,opening_hours,formatted_phone_number,website,geometry,types,reviews,editorial_summary&key=${GOOGLE_API_KEY}`;
  //           const detailsRes = await axios.get(detailsUrl);
  //           const d = detailsRes.data.result;

  //           if (!d) {
  //             throw new Error(`No details found for ${place.name}`);
  //           }

  //           return {
  //             id: placeId,
  //             name: d.name || place.name,
  //             briefDescription:
  //               d.editorial_summary?.overview?.slice(0, 200) + "..." ||
  //               place.description?.slice(0, 200) + "..." ||
  //               `Located in ${
  //                 d.address_components?.[2]?.long_name ||
  //                 d.formatted_address ||
  //                 "this area"
  //               }. A nice place to visit.`,
  //             photos: d.photos?.map(
  //               (photo: any) =>
  //                 `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
  //             ) || ["https://via.placeholder.com/150"],
  //             formatted_address: d.formatted_address || place.address,
  //             openingHours: d.opening_hours?.weekday_text || [],
  //             phoneNumber: d.formatted_phone_number || "",
  //             website: d.website || "",
  //             geometry: d.geometry || {
  //               location: { lat: 0, lng: 0 },
  //               viewport: {
  //                 northeast: { lat: 0, lng: 0 },
  //                 southwest: { lat: 0, lng: 0 }
  //               }
  //             },
  //             types: d.types || ["point_of_interest"],
  //             reviews:
  //               d.reviews?.map((review: any) => ({
  //                 authorName: review.author_name || "Unknown",
  //                 rating: review.rating || 0,
  //                 text: review.text || ""
  //               })) || []
  //           };
  //         } catch (err: any) {
  //           console.warn(
  //             `Failed to fetch details for ${place.name}:`,
  //             err.message
  //           );
  //           return {
  //             id: `ai-${place.name.replace(/\s/g, "-").toLowerCase()}`,
  //             name: place.name,
  //             briefDescription: place.description,
  //             formatted_address: place.address,
  //             photos: ["https://via.placeholder.com/150"],
  //             types: ["point_of_interest"],
  //             openingHours: [],
  //             phoneNumber: "",
  //             website: "",
  //             geometry: {
  //               location: { lat: 0, lng: 0 },
  //               viewport: {
  //                 northeast: { lat: 0, lng: 0 },
  //                 southwest: { lat: 0, lng: 0 }
  //               }
  //             },
  //             reviews: []
  //           };
  //         }
  //       })
  //     );

  //     setAiPlaces(placesWithDetails);
  //     setModalMode("ai");
  //     setModalVisible(true);
  //   } catch (error: any) {
  //     console.error("Error fetching AI places:", error.message);
  //     setError(`Failed to fetch AI recommendations: ${error.message}`);
  //     setAiPlaces([
  //       {
  //         id: "ai-fallback-1",
  //         name: "Placeholder Attraction",
  //         briefDescription: "A popular place to visit in this destination.",
  //         formatted_address: "Unknown Address",
  //         photos: ["https://via.placeholder.com/150"],
  //         types: ["point_of_interest"],
  //         openingHours: [],
  //         phoneNumber: "",
  //         website: "",
  //         geometry: {
  //           location: { lat: 0, lng: 0 },
  //           viewport: {
  //             northeast: { lat: 0, lng: 0 },
  //             southwest: { lat: 0, lng: 0 }
  //           }
  //         },
  //         reviews: []
  //       }
  //     ]);
  //     setModalMode("ai");
  //     setModalVisible(true);
  //   } finally {
  //     setAILoading(false);
  //   }
  // };

  const renderItineraryTab = () => {
    const dates = generateTripDates();

    return (
      <ScrollView className="px-4 pt-4 bg-white">
        <TouchableOpacity
          onPress={fetchAIPlaces}
          disabled={AILoading}
          className="bg-blue-500 rounded-lg mb-4 items-center"
        >
          <View className="flex-row items-center p-3 gap-2">
            {AILoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="auto-awesome" size={20} color="#fff" />
            )}
            <Text className="text-white font-medium ml-2">
              {AILoading
                ? "Fetching AI Suggestions"
                : "Use AI to create Itinerary"}
            </Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dates?.map((date, index) => (
              <TouchableOpacity
                className={`px-4 py-2 mr-2 rounded-lg ${
                  selectedDate === date.value ? "bg-blue-500" : "bg-gray-100"
                }`}
                key={index}
              >
                <Text
                  className={`font-semibold text-sm ${
                    selectedDate === date.value ? "text-white" : "text-gray-700"
                  }`}
                >
                  {date.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {dates?.map((date, index) => {
          const itineraryForDate = (trip.itinerary || []).find(
            (item: any) => item.date === date.value
          );

          const activities = itineraryForDate?.activities || [];

          return (
            <View key={index} className="mb-8">
              <View className="flex-row items-center mb-2">
                <Text className="text-2xl font-extrabold mr-2">
                  {date?.label}
                </Text>
                <Text className="text-gray-400 font-medium">
                  Add Subheading
                </Text>
              </View>

              <View className="flex-row items-center gap-2 mb-2">
                <Text className="text-blue-600 text-sm font-semibold">
                  ✈ Auto-fill day
                </Text>
                <Text className="text-blue-600 text-sm font-semibold">
                  · 🗺 Optimize route
                </Text>
                <Text className="text-xs bg-orange-400 text-white px-1.5 py-0.5 rounded">
                  PRO
                </Text>
              </View>

              {activities.length > 0 ? (
                activities.map((place: any, idx: number) =>
                  renderPlaceCard(place, idx, true)
                )
              ) : (
                <Text className="text-sm text-gray-500 mb-3">
                  No Activities added for this date
                </Text>
              )}

              <TouchableOpacity
                onPress={() => {
                  setSelectedDate(date.value);
                  setModalMode("place");
                  setModalVisible(true);
                }}
                className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3 mb-3"
              >
                <Ionicons name="locate-outline" size={18} color="#777" />
                <Text className="ml-2 text-gray-500">Add a place </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const fetchTrip = useCallback(async () => {
    try {
      const clerkUserId = user?.id;
      if (!clerkUserId || !trip._id) {
        setError("user or trip Id missing");
        return;
      }

      const token = await getToken();

      const response = await axios.get(
        process.env.EXPO_PUBLIC_BACKEND_URL + `/trips/${trip._id}`,
        {
          params: { clerkUserId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setTrip(response.data.trip);
      setError(null);
    } catch (err) {
      console.log("Error", err);
    }
  }, [trip._id, user]);

  useFocusEffect(
    useCallback(() => {
      fetchTrip();
    }, [fetchTrip])
  );

  // Add Place to trip
  // OSM - free version
  const handleAddPlace = async (place: any) => {
    try {
      const placeName = place?.display_name;

      if (!placeName || !trip._id) {
        setError("place or trip id is req");
        return;
      }

      const token = await getToken();
      await axios.post(
        process.env.EXPO_PUBLIC_BACKEND_URL + `/trips/${trip._id}/places`,
        { placeName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchTrip();
      setModalVisible(false);
      setSelectedDate(null);
    } catch (err: any) {
      console.log("Error adding place", err);
      setError(err?.response?.data?.error);
    }
  };

  // Google - paid version
  // const handleAddPlace = async (place: any) => {
  //   try {
  //     const placeId = place?.id;

  //     if (!placeId || !trip._id) {
  //       setError("place or trip id is req");
  //       return;
  //     }

  //     const token = await getToken();
  //     await axios.post(
  //       process.env.EXPO_PUBLIC_BACKEND_URL + `/trips/${trip._id}/places`,
  //       { placeId },
  //       { headers: { Authorization: `Bearer ${token}` } }
  //     );

  //     await fetchTrip();
  //     setModalVisible(false);
  //     setSelectedDate(null);
  //   } catch (err: any) {
  //     console.log("Error adding place", err);
  //     setError(err?.response?.data?.error);
  //   }
  // };

  // Add Place to Itinerary
  // OSM - free vesion
  const handleAddPlaceToItinerary = async (place: any, date: string) => {
    try {
      const placeName = place?.name;

      if (!trip._id || !date) {
        setError("Trip ID or date missing");
        return;
      }

      const token = await getToken();

      const payload = placeName
        ? { placeName, date }
        : { placeData: place, date };

      await axios.post(
        process.env.EXPO_PUBLIC_BACKEND_URL + `/trips/${trip._id}/itinerary`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchTrip();
      setModalVisible(false);
      setSelectedDate(null);
    } catch (err: any) {
      console.log("Error adding place to itinerary", err);
      setError(
        err?.response?.data?.error || "Failed to add place to itinerary"
      );
    }
  };

  // Google - paid vesion
  // const handleAddPlaceToItinerary = async (place: any, date: string) => {
  //   try {
  //     if (!trip._id || !date) {
  //       setError("Trip ID or date missing");
  //       return;
  //     }

  //     const token = await getToken();
  //     const payload =
  //       place.id || place.place_id
  //         ? { placeId: place.id || place.place_id, date }
  //         : { placeData: place, date };

  //     await axios.post(
  //       `http://localhost:3000/api/trips/${trip._id}/itinerary`,
  //       payload,
  //       { headers: { Authorization: `Bearer ${token}` } }
  //     );

  //     await fetchTrip();
  //     setModalVisible(false);
  //     setSelectedDate(null);
  //   } catch (error: any) {
  //     console.error("Error adding place to itinerary:", error);
  //     setError(
  //       error.response?.data?.error || "Failed to add place to itinerary"
  //     );
  //   }
  // };

  const renderExpenseTab = () => {
    const total = expenses.reduce(
      (sum: number, expense: any) =>
        sum + (expense.price || expense.amount || 0),
      0
    );
    return (
      <ScrollView className="px-4 pt-4 bg-white">
        <View className="mb-6">
          <Text className="text-2xl font-extrabold">Budget</Text>
          <Text className="text-sm text-gray-500 mb-4">
            Track your expenses for this trip
          </Text>
          <View className="bg-gray-100 p-4 rounded-lg mb-4">
            <Text className="text-lg font-semibold">
              Total: Rs {total.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setModalMode("expense");
              setModalVisible(true);
            }}
            className="bg-blue-500 p-3 rounded-lg items-center"
          >
            <Text className="text-white font-medium">Add New Expense</Text>
          </TouchableOpacity>

          {expenses?.map((expense, index) => (
            <View className="mb-4 bg-gray-50 rounded-lg p-3 shadow" key={index}>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-sm font-semibold">{expense.description}</Text>
                  <Text className="text-xs text-gray-500">{expense.category}</Text>
                  <Text className="text-xs text-gray-500">Paid By : {expense.paidBy}</Text>
                  <Text className="text-xs text-gray-500">Split : {expense.splitOption}</Text>
                </View>

                <View className="items-end">
                  <Text className="text-sm font-semibold">
                    Rs {(expense.price || Number(expense.amount) || 0).toFixed(2)}
                  </Text>
                  <Text className="text-xs text-gray-400">{dayjs(expense.date).format("MMM D, YYYY")}</Text>
                </View>
              </View>

              <View className="flex-row justify-end mt-2 space-x-2">
                <TouchableOpacity
                  onPress={() => {
                    setEditingExpenses(expense);
                    setExpenseForm({
                      id: expense.id,
                      description: expense.description,
                      category: expense.category,
                      amount: (expense.price || expense.amount || 0).toString(),
                      paidBy: expense.paidBy,
                      splitOption: expense.splitOption,
                      price: expense.price,
                      date: expense.date
                    });

                    setModalMode("editExpense");
                    setModalVisible(true);
                  }}
                  className="bg-blue-100 p-2 rounded"
                >
                  <Ionicons name="pencil" size={16} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteExpense(expense.id)}
                  className="bg-red-100 p-2 rounded"
                >
                  <Ionicons name="trash" size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const handleAddExpense = () => {
    if (
      !expenseForm.description ||
      !expenseForm.category ||
      !expenseForm.amount
    ) {
      setError("Please fill all expense fields");
      return;
    }

    const newExpense = {
      ...expenseForm,
      id: Date.now().toString(),
      price: parseFloat(expenseForm.amount),
      date: dayjs().format("YYYY-MM-DD")
    };

    setExpenses((prev) => [...prev, newExpense]);
    setExpenseForm({
      id: "",
      price: 0,
      date: "",
      description: "",
      category: "",
      amount: "",
      paidBy: "Vijay Singh",
      splitOption: "Don't Split"
    });
    setModalVisible(false);
    setModalMode("place");
  };

  const handleEditExpense = () => {
    if (
      !expenseForm.description ||
      !expenseForm.category ||
      !expenseForm.amount ||
      !editingExpenses
    ) {
      setError("Please fill all expense fields");
      return;
    }

    setExpenses((prev) =>
      prev.map((expense: any) =>
        expense.id == editingExpenses.id
          ? {
              ...expense,
              description: expenseForm.description,
              category: expenseForm.category,
              amount: expenseForm.amount,
              price: parseFloat(expenseForm.amount),
              paidBy: expenseForm.paidBy,
              splitOption: expenseForm.splitOption
            }
          : expense
      )
    );

    setExpenseForm({
      description: "",
      category: "",
      amount: "",
      paidBy: "Vijay Singh",
      splitOption: "Don't Split",
      id: "",
      price: 0,
      date: ""
    });
    setModalVisible(false);
    setModalMode("place");
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  };

  if (!initialTrip) {
    return (
      <SafeAreaView>
        <Text>No trip data provided.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="relative w-full h-48">
        <Image
          source={{
            uri: trip?.background || "https://via.placeholder.com/150"
          }}
          className="w-full h-full"
        />
        <View className="absolute top-0 left-0 w-full h-full bg-black/30" />
        <TouchableOpacity className="absolute bottom-[-32px] left-4 right-4 bg-white p-4 rounded-xl shadow-md flex-row justify-between items-center">
          <Ionicons name="arrow-back" color={"#000"} size={28} />
        </TouchableOpacity>
        <View className="absolute bottom-[-32px] left-4 right-4 bg-white p-4 rounded-xl shadow-md flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-lg font-semibold line-clamp-1">
              Trip to {trip?.tripName || "Unnamed Trip"}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              {trip.startDate ? dayjs(trip.startDate).format("MMM D") : "N/A"} -{" "}
              {trip.endDate ? dayjs(trip.endDate).format("MMM D") : "N/A"}
            </Text>
          </View>
          <View className="items-center min-w-fit">
            <Image
              source={{
                uri:
                  user?.imageUrl ||
                  "https://randomuser.me./api/portraits/women/1.png"
              }}
              className="w-8 h-8 rounded-full mb-1"
            />
            <TouchableOpacity className="bg-black rounded-full px-3 py-1">
              <Text className="text-white text-xs">Share </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="flex-row px-4 mt-12 border-b border-gray-200">
        {["Overview", "Itinerary", "Explore", "$"].map((tab, index) => (
          <TouchableOpacity
            onPress={() => setSelectedTab(tab)}
            className={`mr-6 pb-2 ${selectedTab === tab ? "border-b-2 border-orange-500" : ""}`}
            key={index}
          >
            <Text>{tab} </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTab == "Overview" && (
        <ScrollView className="px-4 pt-4">
          <View className="mb-6 bg-white rounded-lg p-4">
            <Text className="text-sm text-gray-500 mb-1">
              Wanderlog level: <Text>Basic</Text>
            </Text>
            <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <View className="w-1/4 h-full bg-blue-500" />
            </View>
          </View>

          <View className="flex-row justify-between mb-6">
            {[
              {
                title: "Add a reservation",
                subTitle: "Forward an email or add reservation details"
              },
              {
                title: "Explore things to do",
                subTitle: "Add places from top blogs"
              }
            ].map((card, idx) => (
              <View
                className="w-[48%] bg-white p-4 rounded-lg shadow-sm"
                key={idx}
              >
                <Text className="font-semibold mb-2 text-sm">{card.title}</Text>
                <Text className="text-xs text-gray-500 mb-3">
                  {card.subTitle}
                </Text>
                <View className="flex-row justify-between">
                  <Text className="text-blue-500 text-xs font-medium">
                    Skip{" "}
                  </Text>
                  <Text className="text-blue-500 text-xs font-medium">
                    Start{" "}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View className="mb-6 bg-white rounded-lg p-4">
            <Text className="font-semibold mb-3 text-base">
              Reservations and attachments
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { label: "Flight", icon: "airplane" },
                { label: "Lodging", icon: "bed" },
                { label: "Rental car", icon: "car" },
                { label: "Restaurant", icon: "restaurant" },
                { label: "Attachment", icon: "attach" },
                { label: "Other", icon: "ellipsis-horizontal" }
              ].map((item, idx) => (
                <View key={idx} className="items-center mr-6">
                  <Ionicons name={item.icon as any} size={24} />
                  <Text className="text-xs mt-1">{item.label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View className="border-t border-gray-200 bg-white">
            <TouchableOpacity
              onPress={() => setShowNotes(!showNotes)}
              className="p-4 flex-row justify-between items-center"
            >
              <Text>Notes</Text>
              <Ionicons
                name={showNotes ? "chevron-up" : "chevron-down"}
                color={"gray"}
                size={20}
              />
            </TouchableOpacity>
            {showNotes && (
              <View className="px-4 pb-4">
                <Text className="text-gray-500 text-sm">
                  Write or paste general notes here, e.g. how to get around,
                  local trips, reminders
                </Text>
              </View>
            )}
          </View>

          <View className="border-t border-gray-200 bg-white">
            <TouchableOpacity
              onPress={() => setShowPlaces(!showPlaces)}
              className="p-4 flex-row justify-between items-center"
            >
              <Text>Places to Visit</Text>
              <Ionicons
                name={showPlaces ? "chevron-up" : "chevron-down"}
                color={"gray"}
                size={20}
              />
            </TouchableOpacity>
            {showPlaces && (
              <View className="px-4 pb-4">
                {(trip.placesToVisit || []).map((place: any, index: number) =>
                  renderPlaceCard(place, index)
                )}

                {(!trip?.placesToVisit || trip.placesToVisit.length == 0) && (
                  <Text className="text-sm text-gray-500">
                    No Places added yet
                  </Text>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setSelectedDate(null);
                    setModalMode("place");
                    setModalVisible(true);
                  }}
                  className="border border-gray-300 rounded-lg px-4 py-2 mt-2"
                >
                  <Text className="text-sm text-gray-500">Add a place</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {selectedTab == "Itinerary" && renderItineraryTab()}

      {selectedTab == "$" && renderExpenseTab()}

      <View className="absolute right-4 bottom-20 space-y-3 items-end">
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("AIChat", {
              location: trip?.tripName
            })
          }
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-400 to bg-purple-600 items-center justify-center shadow"
        >
          <MaterialIcons name="auto-awesome" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Map", {
              places: trip.placesToVisit || []
            })
          }
          className="w-12 h-12 rounded-full bg-black items-center justify-center shadow mt-2"
        >
          <Ionicons name="map" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity className="w-12 h-12 rounded-full bg-black items-center justify-center shadow mt-2">
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => {
          setModalVisible(false);
          setSelectedDate(null);
          setModalMode("place");
        }}
        style={{ justifyContent: "flex-end", margin: 0 }}
      >
        <View className="bg-white p-4 rounded-t-2xl h-[60%]">
          {modalMode == "place" && selectedTab !== "Itinerary" ? (
            <>
              <Text className="text-lg font-semibold mb-4">
                Search for a place
              </Text>
              {/* Free version */}
              <OSMPlacesAutocomplete
                placeholder="Search for a place"
                onPress={handleAddPlace}
              />
              {/* Paid version */}
              {/* <GooglePlacesAutocomplete
                placeholder="Search for a place"
                fetchDetails={true}
                enablePoweredByContainer={false}
                onPress={async (data, details = null) => {
                  try {
                    const GOOGLE_API_KEY =
                      process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
                    const placeId = data.place_id;
                    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`;
                    const res = await fetch(url);
                    const json = await res.json();

                    if (json.status !== "OK" || !json.result) {
                      throw new Error(
                        `Google places api error ${json.status || "No res found"}`
                      );
                    }

                    const d = json.result;
                    const place = {
                      id: placeId,
                      name: d.name || "Unknown place",
                      briefDescription:
                        d.editorial_summary?.overview?.slice(0, 200) + "..." ||
                        d.reviews?.[0]?.text?.slice(0, 200) + "..." ||
                        `Located in ${d.address_components?.[2]?.long_name || d.formatted_address || "this area"}. A nice place to visit.`,
                      photos:
                        d.photos?.map(
                          (photo: any) =>
                            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
                        ) || [],
                      formatted_address: d.formatted_address || "No address",
                      openingHours: d.opening_hours?.weekday_text || [],
                      phoneNumber: d.formatted_phone_number || "",
                      website: d.website || "",
                      geometry: d.geometry || {
                        location: { lat: 0, lng: 0 },
                        viewport: {
                          northeast: { lat: 0, lng: 0 },
                          southwest: { lat: 0, lng: 0 }
                        }
                      },
                      types: d.types || [],
                      reviews:
                        d.reviews?.map((review: any) => ({
                          authorName: review.author_name || "Unknown",
                          rating: review.rating || 0,
                          text: review.text || ""
                        })) || []
                    };

                    await handleAddPlace(place);
                  } catch (err) {
                    console.log("Error", err);
                  }
                }}
              /> */}
            </>
          ) : modalMode == "place" && selectedTab == "Itinerary" ? (
            <>
              <Text className="text-lg font-semibold mt-2 mb-2">
                {selectedDate
                  ? `Add Place to ${dayjs(selectedDate).format("ddd D/M")}`
                  : "Search for a place"}
              </Text>
              <OSMPlacesAutocomplete
                placeholder="Search for a place"
                onPress={(place) =>
                  handleAddPlaceToItinerary(place, selectedDate)
                }
              />

              {/* Paid version */}
              {/* <GooglePlacesAutocomplete
                placeholder="Search for a place"
                fetchDetails={true}
                enablePoweredByContainer={false}
                onPress={async (data, details = null) => {
                  try {
                    const GOOGLE_API_KEY =
                      process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
                    const placeId = data.place_id;
                    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`;
                    const res = await fetch(url);
                    const json = await res.json();

                    if (json.status !== "OK" || !json.result) {
                      throw new Error(
                        `Google places api error ${json.status || "No res found"}`
                      );
                    }

                    const d = json.result;
                    const place = {
                      id: placeId,
                      name: d.name || "Unknown place",
                      briefDescription:
                        d.editorial_summary?.overview?.slice(0, 200) + "..." ||
                        d.reviews?.[0]?.text?.slice(0, 200) + "..." ||
                        `Located in ${d.address_components?.[2]?.long_name || d.formatted_address || "this area"}. A nice place to visit.`,
                      photos:
                        d.photos?.map(
                          (photo: any) =>
                            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
                        ) || [],
                      formatted_address: d.formatted_address || "No address",
                      openingHours: d.opening_hours?.weekday_text || [],
                      phoneNumber: d.formatted_phone_number || "",
                      website: d.website || "",
                      geometry: d.geometry || {
                        location: { lat: 0, lng: 0 },
                        viewport: {
                          northeast: { lat: 0, lng: 0 },
                          southwest: { lat: 0, lng: 0 }
                        }
                      },
                      types: d.types || [],
                      reviews:
                        d.reviews?.map((review: any) => ({
                          authorName: review.author_name || "Unknown",
                          rating: review.rating || 0,
                          text: review.text || ""
                        })) || []
                    };

                    if (selectedDate) {
                      await handleAddPlaceToItinerary(place, selectedDate);
                    } else {
                      setError("Please select a date to add this place to the itinerary")  
                    }
                  } catch (err) {
                    console.log("Place detail error:", err.message);
                    setError(`Failed to fetch place details: ${err.message}`);
                  }
                }}
              /> */}

              <Text className="text-sm font-semibold mt-2 mb-1">
                Select Date
              </Text>

              <View className="flex-row items-center gap-2">
                {generateTripDates().map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedDate(date.value)}
                    className={`px-3 py-1.5 mr-2 rounded-full border ${selectedDate === date.value ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"}`}
                  >
                    <Text
                      className={`text-xs font-medium ${selectedDate === date.value ? "text-white" : "text-gray-700"}`}
                    >
                      {date.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(trip?.placesToVisit || []).length > 0 && (
                <View className="flex-1 mt-2">
                  <Text className="text-sm font-semibold mb-1">
                    Previously Added Places
                  </Text>
                  <ScrollView className="flex-1">
                    {trip?.placesToVisit?.map((place: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          if (selectedDate) {
                            handleAddPlaceToItinerary(place, selectedDate);
                          } else {
                            setError("Please select a date to add this place");
                          }
                        }}
                        className="flex-row items-center p-2 border-b border-gray-200"
                      >
                        <Image
                          className="w-12 h-12 rounded-md mr-2"
                          source={{ uri: place?.photos[0] }}
                        />
                        <View>
                          <Text className="text-sm font-medium">
                            {place?.name}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            {place?.formatted_address}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          ) : modalMode == "ai" ? (
            <>
              <Text>
                {selectedDate
                  ? `Add AI-Suggested Place to ${dayjs(selectedDate).format("ddd D/M")}`
                  : "Select a date for AI Suggested places"}
              </Text>

              <Text className="text-sm font-semibold mt-2 mb-1">
                Select Date
              </Text>

              <View className="flex-row items-center gap-2">
                {generateTripDates().map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedDate(date.value)}
                    className={`px-3 py-1.5 mr-2 rounded-full border ${selectedDate === date.value ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"}`}
                  >
                    <Text
                      className={`text-xs font-medium ${selectedDate === date.value ? "text-white" : "text-gray-700"}`}
                    >
                      {date.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {aiPlaces?.length > 0 && (
                <View className="mt-4">
                  <Text className="text-sm font-semibold mb-1">
                    AI Suggested Places
                  </Text>

                  <ScrollView>
                    {aiPlaces?.map((place: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          if (selectedDate) {
                            handleAddPlaceToItinerary(place, selectedDate);
                          } else {
                            setError("Please select a date to add this place");
                          }
                        }}
                        className="flex-row items-center p-2 border-b border-gray-200"
                      >
                        <Image
                          className="w-12 h-12 rounded-md mr-2"
                          source={{ uri: place?.photos[0] }}
                        />
                        <View>
                          <Text className="text-sm font-medium">
                            {place?.name}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            {place?.formatted_address}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          ) : (
            <>
              <Text className="text-lg font-semibold mb-4">
                {modalMode == "editExpense"
                  ? "Edit expense"
                  : "Add new expense"}
              </Text>
              <ScrollView>
                <Text className="text-sm font-medium mb-2">Description</Text>
                <TextInput
                  value={expenseForm.description}
                  onChangeText={(text) =>
                    setExpenseForm({ ...expenseForm, description: text })
                  }
                  placeholder="Enter expense description"
                  className="bg-gray-100 p-3 rounded-lg mb-4"
                />
                <Text className="text-sm font-medium mb-2">Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {categories?.map((category, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() =>
                        setExpenseForm({ ...expenseForm, category })
                      }
                      className={`px-4 py-2 mr-2 rounded-lg ${expenseForm.category === category ? "bg-blue-500" : "bg-gray-100"}`}
                    >
                      <Text
                        className={`text-sm font-medium ${expenseForm.category === category ? "text-white" : "text-gray-700"}`}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text className="text-sm font-medium mb-2">Amount</Text>
                <TextInput
                  value={expenseForm.amount}
                  onChangeText={(text) =>
                    setExpenseForm({ ...expenseForm, amount: text })
                  }
                  placeholder="Enter Amount"
                  className="bg-gray-100 p-3 rounded-lg mb-4"
                />

                <Text className="text-sm font-medium mb-2">PaidBy</Text>
                <TextInput
                  value={expenseForm.paidBy}
                  onChangeText={(text) =>
                    setExpenseForm({ ...expenseForm, paidBy: text })
                  }
                  placeholder="Enter name"
                  className="bg-gray-100 p-3 rounded-lg mb-4"
                />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {splitOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() =>
                        setExpenseForm({
                          ...expenseForm,
                          splitOption: option.value
                        })
                      }
                      className={`px-4 py-2 mr-2 rounded-lg ${expenseForm.splitOption === option.value ? "bg-blue-500" : "bg-gray-100"}`}
                    >
                      <Text
                        className={`text-sm font-medium ${expenseForm.splitOption === option.value ? "text-white" : "text-gray-700"}`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  onPress={
                    modalMode == "editExpense"
                      ? handleEditExpense
                      : handleAddExpense
                  }
                  className="bg-blue-500 p-3 rounded-lg items-center"
                >
                  <Text className="text-white font-medium">
                    {modalMode == "editExpense"
                      ? "Save Changes"
                      : "Add Expense"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PlanTripScreen;

const styles = StyleSheet.create({});
