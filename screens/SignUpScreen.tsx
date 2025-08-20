import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useSignUp } from "@clerk/clerk-expo";

const SignUpScreen = () => {
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigation = useNavigation();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        emailAddress,
        password
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      console.log("Error:", err);
      setError(err.errors[0]?.message || "Sign-up failed");
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
      } else {
        console.error("Error in verifying the user")
        setError("Verification incomplete. Please try again")
      }
    } catch (error: any) {
      console.log("Verification error", error);
      setError(error.errors[0]?.message || "Verification failed");
    }
  };

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text>Verify your email</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="Enter your verification code"
        />
        {/* {error ? <Text style={styles.error}>{error}</Text> : null} */}
        <TouchableOpacity style={styles.button} onPress={onVerifyPress}>
          <Text>Verify </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

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

      <TouchableOpacity onPress={onSignUpPress} style={styles.button}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        <Text style={styles.linkText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.linkText, { color: "#FF5722" }]}>Sign In </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SignUpScreen;

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
