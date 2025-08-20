import { useClerk, useUser } from "@clerk/clerk-expo";
import { Entypo, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import dayjs from "dayjs";
import React, { useCallback, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeStackParamList } from "../navigation/HomeStack";

// Define TabNavigatorParamList
export type TabNavigatorParamList = {
  Home: { screen?: string; params?: any }; // Allow nested navigation
  Guides: undefined;
  Profile: undefined;
};

// Combined navigation prop type
type ProfileScreenNavigationProp = NativeStackNavigationProp<
  TabNavigatorParamList & HomeStackParamList
>;

const ProfileScreen = () => {
  const { signOut } = useClerk();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [rawTrips, setRawTrips] = useState([]);
  const { user } = useUser();

  const handleSignout = async () => {
    try {
      await signOut();
    } catch (err: any) {
      console.log("Error:", err);
    }
  };

  const fetchTrips = useCallback(async () => {
    try {
      const clerkUserId = user?.id;
      if (!clerkUserId) return setError("User not authenticated");

      const response = await axios.get(
        process.env.EXPO_PUBLIC_BACKEND_URL + "/trips",
        {
          params: { clerkUserId }
        }
      );

      const formattedTrips = response.data.trips.map((trip: any) => ({
        id: trip._id,
        name: trip.tripName,
        date: `${dayjs(trip.startDate).format("D MMM")} - ${dayjs(trip.endDate).format("D MMM. YYYY")}`,
        image: trip.background || "https://via.placeholder.com/150",
        places: trip.placesToVisit?.length || 0,
        daysLeft: dayjs(trip.startDate).isAfter(dayjs())
          ? dayjs(trip.startDate).diff(dayjs(), "day")
          : null
      }));

      setTrips(formattedTrips);
      // console.log("formattedTrips", formattedTrips.daysLeft);
      setRawTrips(response.data.trips);
      setError(null);
    } catch (err: any) {
      console.log("Error", err);
      setError(err.response.data?.error || "Failed to fetch trips");
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips])
  );

  const profileImage =
    user?.imageUrl &&
    user.externalAccounts.some((acc) => acc.provider == "google")
      ? user?.imageUrl
      : "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";

  const safeName = user?.fullName ?? "User";
  const safeHandle = user?.username
    ? `@${user.username}`
    : user?.id
      ? `@${user.id.slice(0, 8)}`
      : "@unknown";
  const safeEmail =
    user?.primaryEmailAddress?.emailAddress ?? "No email address";

  return (
    <SafeAreaView className="bg-white flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="bg-pink-100 items-center pb-6 rounded-b-3xl relative">
          <View className="absolute top-4 left-4 bg-yellow-400 px-3 py-1 rounded-full">
            <Text className="text-xs text-white font-semibold">PRO</Text>
          </View>
          <View>
            <Image
              className="w-24 h-24 rounded-full"
              source={{ uri: profileImage }}
            />
          </View>
          <Text className="mt-3 text-lg font-semibold">{safeName}</Text>
          <Text className="text-gray-500">{safeHandle}</Text>
          <Text className="text-gray-500 text-sm mt-1">{safeEmail}</Text>

          <View className="flex-row justify-center mt-4 space-x-12">
            <View className="items-center">
              <Text className="font-bold text-base">0</Text>
              <Text className="text-xs text-gray-500 tracking-wide">
                FOLLOWS
              </Text>
            </View>
            <View className="items-center">
              <Text className="font-bold text-base">0</Text>
              <Text className="text-xs text-gray-500 tracking-wide">
                FOLLOWING
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSignout}
            className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white text-base">Sign Out </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
          <Text className="text-sm text-orange-500 font-semibold mr-6">
            Trips
          </Text>
          <Text className="text-sm text-gray-400 mr-auto">Guides</Text>
          <TouchableOpacity className="flex-row items-center space-x-1">
            <Ionicons name="swap-vertical-outline" size={16} color="#666" />
            <Text className="text-sm text-gray-500">Sort </Text>
          </TouchableOpacity>
        </View>

        {trips.length === 0 && !error && (
          <View className="px-4 mt-4">
            <Text className="text-gray-500 text-sm">
              No trips found. Create a new trip!
            </Text>
          </View>
        )}

        {trips?.map((trip: any, index) => (
          <Pressable
            onPress={() =>
              navigation.navigate("Home", {
                screen: "PlanTrip",
                params: { trip: rawTrips[index] }
              })
            }
            className="flex-row items-start bg-white rounded-xl shadow-sm mx-4 mt-4 p-3"
            key={index}
          >
            <Image
              className="w-16 h-16 rounded-lg mr-3"
              source={{ uri: trip.image || "https://via.placeholder.com/150" }}
            />
            <View className="flex-1">
              {typeof trip.daysLeft === "number" && (
                <Text className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full self-start font-semibold mb-1">
                  In {String(trip.daysLeft)} days
                </Text>
              )}
              <Text className="text-sm font-semibold text-gray-900 mb-1">
                {trip?.name ?? "Untitled Trip"}
              </Text>
              <View className="flex-row items-center">
                <Image
                  className="w-4 h-4 rounded-full mr-2"
                  source={{ uri: profileImage }}
                />
                <Text className="text-sm text-gray-500">
                  {(trip?.date ?? "No date").toString()} •{" "}
                  {String(trip?.places ?? 0)} places
                </Text>
              </View>
            </View>
            <Entypo name="dots-three-vertical" size={14} color="#999" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({});
