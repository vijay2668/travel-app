import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import GoogleSignIn from "../components/GoogleSignIn";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useSignIn } from "@clerk/clerk-expo";

// Define navigation prop type
type GuideScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SignInScreen = () => {
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigation = useNavigation<GuideScreenNavigationProp>();
  const { isLoaded, signIn, setActive } = useSignIn();

  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
      } else {
        console.error(
          "Sign-in incomplete",
          JSON.stringify(signInAttempt, null, 2)
        );
        setError("Sign-in incomplete. Please try again");
      }
    } catch (err: any) {
      console.log("Error:", err);
      setError(err.errors[0]?.message || "Sign-In failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>

      <TextInput
        autoCapitalize="none"
        placeholder="Enter Email"
        onChangeText={setEmailAddress}
        value={emailAddress}
        style={styles.input}
      />
      <TextInput
        secureTextEntry
        placeholder="Enter Password"
        onChangeText={setPassword}
        value={password}
        style={styles.input}
      />

      <TouchableOpacity onPress={onSignInPress} style={styles.button}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        <Text style={styles.linkText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
          <Text style={[styles.linkText, { color: "#FF5722" }]}>Sign Up </Text>
        </TouchableOpacity>
      </View>

      <GoogleSignIn />
    </View>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20
  },
  input: {
    width: "100%",
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5
  },
  button: {
    backgroundColor: "#FF5722",
    padding: 12,
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
    marginTop: 10
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  linkContainer: {
    flexDirection: "row",
    marginTop: 20
  },
  linkText: {
    fontSize: 16
  },
  error: {
    color: "red",
    marginBottom: 10
  }
});
