import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
  Dimensions,
  Text,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent
} from "react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { LeafletView, MapMarker } from "react-native-leaflet-view";
import { HomeStackParamList } from "../navigation/HomeStack";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.8;
const SPACING = 12;

export type Place = {
  id: string;
  name: string;
  briefDescription: string;
  photos: string[];
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

const MapScreen = () => {
  const route = useRoute<RouteProp<HomeStackParamList, "Map">>();
  const places = route.params?.places || [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [webViewContent, setWebViewContent] = useState<string | null>(null);

  // start centered on average of places, or fallback
  const [leafletProps, setLeafletProps] = useState({
    location: {
      lat:
        places.length > 0
          ? places.reduce((sum, p) => sum + p.geometry.location.lat, 0) /
            places.length
          : 37.78825,
      lng:
        places.length > 0
          ? places.reduce((sum, p) => sum + p.geometry.location.lng, 0) /
            places.length
          : -122.4324
    },
    zoom: 12
  });

  // Convert places to LeafletView markers
  const mapMarkers: MapMarker[] = places.map((place, index) => ({
    id: place.id || `marker-${index}`,
    position: {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng
    },
    icon: "📍",
    size: [32, 32],
    title: place.name
  }));

  const moveToRegion = (place: Place) => {
    const location = place.geometry.location;
    setLeafletProps({ ...leafletProps, zoom: 14 }); // declarative re-center
    setTimeout(() => {
      setLeafletProps({ zoom: 14, location}); // declarative re-center
    }, 500);
  };

  const onCardScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(
      e.nativeEvent.contentOffset.x / (CARD_WIDTH + SPACING)
    );

    if (index !== selectedIndex && places[index]) {
      setSelectedIndex(index);
      moveToRegion(places[index]);
    }
  };

  // Load leaflet.html from assets robustly
  useEffect(() => {
    let isMounted = true;

    const loadHtml = async () => {
      try {
        const path = require("../assets/leaflet.html");
        const asset = Asset.fromModule(path);
        await asset.downloadAsync();
        const htmlContent = await FileSystem.readAsStringAsync(asset.localUri!);

        if (isMounted) {
          setWebViewContent(htmlContent);
        }
      } catch (error) {
        Alert.alert("Error loading HTML", JSON.stringify(error));
        console.error("Error loading HTML:", error);
      }
    };

    loadHtml();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!webViewContent) {
    return (
      <View className="flex items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <LeafletView
        source={{ html: webViewContent }}
        mapCenterPosition={leafletProps.location}
        mapMarkers={mapMarkers}
        zoom={leafletProps.zoom}
        zoomControl
        attributionControl
        onMessageReceived={(msg) => {
          console.log("Leaflet event:", msg);
        }}
      />

      <View className="absolute bottom-6">
        <FlatList
          ref={flatListRef}
          data={places}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => i.toString()}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SPACING }}
          onScroll={onCardScroll}
          renderItem={({ item, index }) => (
            <View
              key={index}
              className="bg-white rounded-2xl shadow-lg p-4"
              style={{ width: CARD_WIDTH, marginRight: SPACING }}
            >
              <Text className="text-base font-semibold text-black">
                {item?.name || "Unknown place"}
              </Text>
              {item?.briefDescription && (
                <Text className="text-sm text-gray-500 mt-1">
                  {item.briefDescription}
                </Text>
              )}

              {item.photos?.[0] && (
                <Image
                  source={{
                    uri: item?.photos[0] || "https://via.placeholder.com/150"
                  }}
                  className="h-24 w-full rounded-lg mt-2"
                  resizeMode="cover"
                />
              )}

              {item?.formatted_address && (
                <Text className="text-sm text-gray-400 mt-1">
                  {item?.formatted_address}
                </Text>
              )}
            </View>
          )}
        />
      </View>
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({});
