import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
  Dimensions,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GuideStackParamList } from "../navigation/GuideStack";

// Define navigation prop type
type GuideScreenNavigationProp = NativeStackNavigationProp<GuideStackParamList>;

// Sample data for Karnataka places
const places = [
  {
    id: "1",
    name: "Mysore Palace",
    image:
      "https://www.worldatlas.com/r/w1200/upload/e5/0e/5f/shutterstock-122322643.jpg",
    description:
      "The iconic Mysore Palace, a masterpiece of Indo-Saracenic architecture, is a must-visit for its grandeur and vibrant history. Illuminated at night, it hosts the famous Dussehra festival.",
    attributes: {
      location: "Mysore, Karnataka",
      type: "Heritage",
      bestTime: "October - April",
      attractions: ["Dussehra Festival", "Durbar Hall", "Royal Artifacts"]
    }
  },
  {
    id: "2",
    name: "Coorg (Kodagu)",
    image:
      "https://static.toiimg.com/thumb/104040262/coorg.jpg?width=1200&height=900",
    description:
      "Known as the Scotland of India, Coorg is a misty hill station famous for its coffee plantations, lush greenery, and serene waterfalls.",
    attributes: {
      location: "Kodagu, Karnataka",
      type: "Hill Station",
      bestTime: "October - March",
      attractions: [
        "Abbey Falls",
        "Raja’s Seat",
        "Coffee Plantations",
        "Trekking"
      ]
    }
  },
  {
    id: "3",
    name: "Hampi",
    image:
      "https://images.travelandleisureasia.com/wp-content/uploads/sites/2/2025/02/12133950/Hampi-places-to-visit-FI-1600x900.jpg",
    description:
      "A UNESCO World Heritage Site, Hampi is a historic village with ancient ruins of the Vijayanagara Empire, featuring stunning temples and boulders.",
    attributes: {
      location: "Ballari, Karnataka",
      type: "Heritage",
      bestTime: "October - February",
      attractions: [
        "Virupaksha Temple",
        "Vijaya Vittala Temple",
        "Rock Climbing"
      ]
    }
  },
  {
    id: "4",
    name: "Gokarna",
    image:
      "https://s7ap1.scene7.com/is/image/incredibleindia/om-beach-gokarna-karnataka-tri-hero?qlt=82&ts=1727164538227&wid=800",
    description:
      "A serene coastal town with pristine beaches and ancient temples, Gokarna is perfect for those seeking spirituality and relaxation.",
    attributes: {
      location: "Uttara Kannada, Karnataka",
      type: "Beach / Pilgrimage",
      bestTime: "October - March",
      attractions: ["Om Beach", "Mahabaleshwar Temple", "Surfing"]
    }
  }
];

const GuideScreen = () => {
  const navigation = useNavigation<GuideScreenNavigationProp>();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-800">
            Explore Karnataka
          </Text>
          <Text className="text-sm font-medium text-gray-700 mt-1">
            Discover the best places to visit in Karnataka
          </Text>
        </View>
        {places?.map((place) => (
          <Pressable
            onPress={
              () => navigation.navigate("GuideDetail", { place }) // Placeholder screen
            }
            style={styles.card}
            key={place.id}
            className="mx-4 mt-4 rounded-xl overflow-hidden shadow-sm"
          >
            <ImageBackground
              className="w-full h-full"
              source={{ uri: place.image }}
              style={styles.image}
            >
              <View className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />

              <View className="p-4 flex-1 justify-end">
                <Text className="text-black text-xl font-bold mb-2">
                  {place.name}
                </Text>
                <Text className="text-black text-sm font-medium line-clamp-2">
                  {place.description}
                </Text>
              </View>
            </ImageBackground>

            <View className="bg-white p-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="location-outline" size={16} color="#FF5722" />
                <Text className="text-gray-800 text-sm font-medium ml-2">
                  {place.attributes.location}
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="map-outline" size={16} color="#FF5722" />
                <Text className="text-gray-800 text-sm font-medium ml-2">
                  {place.attributes.type}
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="calendar-outline" size={16} color="#FF5722" />
                <Text className="text-gray-800 text-sm font-medium ml-2">
                  {place.attributes.bestTime}
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="star-outline" size={16} color="#FF5722" />
                <Text className="text-gray-800 text-sm font-medium ml-2">
                  Attractions: {place.attributes.attractions.join(", ")}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default GuideScreen;

const styles = StyleSheet.create({
  image: {
    height: "60%"
  },
  card: {
    height: Dimensions.get("window").height * 0.5,
    marginBottom: 16
  }
});
