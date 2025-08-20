import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import NewTripScreen from "../screens/NewTripScreen";
import PlanTripScreen from "../screens/PlanTripScreen";
import AIChatScreen from "../screens/AIChatScreen";
import MapScreen, { Place } from "../screens/MapScreen";

export type HomeStackParamList = {
  HomeMain: undefined;
  NewTrip: undefined;
  PlanTrip: { trip: any };
  AIChat: { location: any };
  Map: { places: Place[] };
};

const HomeStack = () => {
  const Stack = createNativeStackNavigator<HomeStackParamList>();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="NewTrip" component={NewTripScreen} />
      <Stack.Screen name="PlanTrip" component={PlanTripScreen} />
      <Stack.Screen name="AIChat" component={AIChatScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;

const styles = StyleSheet.create({});
