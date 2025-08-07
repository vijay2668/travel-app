import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet } from "react-native";
import HomeScreen from "../screens/HomeScreen";

export type HomeStackParamList = {
  HomeMain: undefined;
  NewTrip: undefined;
  PlanTrip: { trip: any };
};

const HomeStack = () => {
  const Stack = createNativeStackNavigator<HomeStackParamList>();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;

const styles = StyleSheet.create({});
