import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import dayjs from "dayjs";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import OSMPlacesAutocomplete from "../components/OSMPlacesAutocomplete";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../navigation/HomeStack";

type NewTripScreenNavigationProp =
  NativeStackNavigationProp<HomeStackParamList>;

const NewTripScreen = () => {
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});
  const [displayStart, setDisplayStart] = useState("");
  const [displayEnd, setDisplayEnd] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [chosenLocation, setChosenLocation] = useState("");
  const navigation = useNavigation<NewTripScreenNavigationProp>();
  const [error, setError] = useState("");
  const { user } = useUser();

  const today = dayjs().format("YYYY-MM-DD");

  const getMarkedDates = () => {
    const marks: any = {};

    const { startDate, endDate } = selectedRange;
    if (startDate && !endDate) {
      marks[startDate] = {
        startingDay: true,
        endingDay: true,
        color: "#FF5722",
        textColor: "white"
      };
    } else if (startDate && endDate) {
      let curr = dayjs(startDate);
      const end = dayjs(endDate);

      while (curr.isBefore(end) || curr.isSame(end)) {
        const formatted = curr.format("YYYY-MM-DD");
        marks[formatted] = {
          color: "#FF5722",
          textColor: "white",
          ...(formatted === startDate && { startingDay: true }),
          ...(formatted === endDate && { endingDay: true })
        };
        curr = curr.add(1, "day");
      }
    }

    return marks;
  };

  const handleDayPress = (day: any) => {
    const selected = day.dateString;
    if (
      !selectedRange.startDate ||
      (selectedRange.startDate && selectedRange.endDate)
    ) {
      setSelectedRange({ startDate: selected });
    } else if (
      selectedRange.startDate &&
      dayjs(selected).isAfter(selectedRange.startDate)
    ) {
      setSelectedRange({ ...selectedRange, endDate: selected });
    }
  };

  const onSaveDates = () => {
    if (selectedRange.startDate) setDisplayStart(selectedRange.startDate);
    if (selectedRange.endDate) setDisplayEnd(selectedRange.endDate);
    setCalendarVisible(false);
  };

  const [isLoading, setIsLoading] = useState(false);
  const handleCreateTrip = async () => {
    try {
      setIsLoading(true);
      setError("");

      if (
        !chosenLocation ||
        !selectedRange.startDate ||
        !selectedRange.endDate
      ) {
        setError("Please select a location and date range");
        return;
      }

      const clerkUserId = user?.id;
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!clerkUserId || !email) {
        setError("User not authenticated or email missing");
        return;
      }

      let background = "https://via.placeholder.com/150";

      try {
        // Use Nominatim to get location details (lat/lon)
        const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          chosenLocation
        )}&limit=1`;

        // const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(chosenLocation)}&inputtype=textquery&fields=place_id,photos&key=${GOOGLE_API_KEY}`;

        const osmRes = await axios.get(osmUrl, {
          headers: {
            "User-Agent": "travel-app/1.0 (wiwek99777@ahvin.com)",
            "Accept-Language": "en"
          }
        });

        // const findPlacesRes = await axios.get(findPlaceUrl);

        const place = osmRes.data?.[0];
        if (place) {
          // Use Unsplash to find a background image for the location
          const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
            place.display_name
          )}&orientation=landscape&client_id=${process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY}`;
          const unsplashRes = await axios.get(unsplashUrl);
          const photos = unsplashRes.data?.results;
          if (photos?.length > 0) {
            background = photos[0].urls.regular;
          }
        }

        // const placeId = findPlacesRes.data.candidates?.[0]?.place_id;

        // if (placeId) {
        //   const detailsURl = `https://map.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_API_KEY}`;
        //   const detailsRes = await axios.get(detailsURl);
        //   const photos = detailsRes.data.result?.photos;
        //   if (photos?.length > 0) {
        //     background = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photos[0].photo_reference}&key=${GOOGLE_API_KEY}`;
        //   }
        // }
      } catch (photoError) {
        console.log("Error fetching place photo", photoError);
      }

      const tripData = {
        tripName: chosenLocation,
        startDate: selectedRange.startDate,
        endDate: selectedRange.endDate,
        startDay: dayjs(selectedRange.startDate).format("dddd"),
        endDay: dayjs(selectedRange.endDate).format("dddd"),
        background,
        clerkUserId,
        userData: {
          email,
          name: user?.fullName || ""
        }
      };

      const response = await axios.post(
        process.env.EXPO_PUBLIC_BACKEND_URL + "/trips",
        tripData
      );

      const createdTrip = response.data.trip;

      navigation.navigate("PlanTrip", { trip: createdTrip });
    } catch (err) {
      console.log("Error", err);
    } finally {
      setIsLoading(false);
    }
  };

  //   console.log("data", calendarVisible);

  return (
    <SafeAreaView className="flex-1 bg-white px-5">
      <View className="mt-2 mb-4">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" color="#000" size={28} />
        </TouchableOpacity>
      </View>

      <Text className="text-2xl font-bold text-gray-900 mb-1">
        Plan a new trip
      </Text>
      <Text className="text-base text-gray-500 mb-6">
        Build an itinerary and map out your upcoming travel plans
      </Text>

      <TouchableOpacity
        onPress={() => setSearchVisible(true)}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
      >
        <Text className="text-sm font-semibold text-gray-700 mb-1">
          Where to?
        </Text>
        <Text className="text-base text-gray-500">
          {chosenLocation || "E.g Paris, Hawaii, Japan"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setCalendarVisible(true)}
        className="flex-row border border-gray-300 rounded-xl px-4 py-3 justify-between mb-4"
      >
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-700 mb-1">
            Dates (optional)
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="calendar" color="#000" size={16} className="mr-1" />
            <Text className="text-sm text-gray-500">
              {displayStart
                ? dayjs(displayStart).format("MMM D")
                : "Start Date"}
            </Text>
          </View>
        </View>

        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-700 mb-1 invisible">
            •
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="calendar" color="#666" size={16} className="mr-1" />
            <Text className="text-sm text-gray-500">
              {displayEnd ? dayjs(displayEnd).format("MMM D") : "End Date"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View className="flex-row justify-between items-center mb-8">
        <TouchableOpacity>
          <Text className="text-sm text-gray-600 font-medium">
            + Invite a trip mate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <Ionicons name="people" size={16} color="#666" />
          <Text className="ml-1 text-sm text-gray-600 font-medium">
            Friends
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {error && <Text className="text-red-500 text-sm mb4">{error}</Text>}

      <TouchableOpacity
        onPress={handleCreateTrip}
        className="bg-orange-500 rounded-full py-3 items-center mb-4"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text className="text-white font-semibold text-base">
            Start Planning
          </Text>
        )}
      </TouchableOpacity>

      <Text className="text-sm text-gray-500 text-center">
        Or see an example for{" "}
        <Text className="font-semibold text-gray-600">New York</Text>
      </Text>

      <Modal animationType="slide" transparent visible={calendarVisible}>
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-white rounded-2xl w-11/12">
            <Calendar
              markingType="period"
              markedDates={getMarkedDates()}
              onDayPress={handleDayPress}
              minDate={today}
              theme={{
                todayTextColor: "#FF5722",
                arrowColor: "#00BFFF",
                selectedDayTextColor: "#FFF"
              }}
            />
            <Pressable
              onPress={onSaveDates}
              className="p-4 border-t border-gray-200 items-center"
            >
              <Text className="text-gray-700 font-semibold">Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" visible={searchVisible}>
        <SafeAreaView className="flex-1 bg-white pt-10 px-4">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={() => setSearchVisible(false)}
              className="mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">
              Search for a place
            </Text>
          </View>

          {/* Google Places Autocomplete */}
          {/* <GooglePlacesAutocomplete
            placeholder="Search for a place"
            fetchDetails={true}
            enablePoweredByContainer={false}
            onPress={(data, details = null) => {
              if (data?.description) {
                setChosenLocation(data.description);
              }
              setSearchVisible(false);
            }}
            query={{
              key: GOOGLE_API_KEY,
              language: "en"
            }}
            styles={{
              container: {
                flex: 0
              },
              textInputContainer: {
                flexDirection: "row",
                backgroundColor: "#f1f1f1",
                borderRadius: 30,
                paddingHorizontal: 10,
                alignItems: "center"
              },
              textInput: {
                flex: 1,
                height: 44,
                color: "#333",
                fontSize: 16,
                backgroundColor: "#f1f1f1",
                borderRadius: 25
              },
              listView: {
                marginTop: 10,
                backgroundColor: "#fff"
              }
            }}
          /> */}
          {/*  Free Autocomplete with OpenStreetMap (Nominatim) */}
          <OSMPlacesAutocomplete
            placeholder="Search for a place"
            onPress={(place: any) => {
              // console.log("Selected place:", place);
              // Example: place.lat, place.lon, place.display_name
              // console.log(place);
              if (place?.display_name) {
                setChosenLocation(place.display_name);
              }
              setSearchVisible(false);
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default NewTripScreen;

const styles = StyleSheet.create({});
