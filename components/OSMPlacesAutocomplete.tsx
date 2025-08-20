import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet
} from "react-native";

type Props = {
  placeholder: string;
  onPress: (place: any) => void;
};

export default function OSMPlacesAutocomplete({
  placeholder,
  onPress
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const debounceRef: any = useRef(null);

  const fetchPlaces = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5`,
        {
          headers: {
            "User-Agent": "travel-app/1.0 (wiwek99777@ahvin.com)",
            "Accept-Language": "en"
          }
        }
      );

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Error fetching places:", err);
    }
  };

  // Debounced text change handler
  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPlaces(text);
    }, 400); // 400ms debounce
  };

  const handleSelect = (place: { display_name: string }) => {
    setQuery(place.display_name);
    setResults([]);
    if (onPress) onPress(place);
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder={placeholder}
        value={query}
        onChangeText={handleChangeText}
        style={styles.input}
      />
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item: any) => item.place_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSelect(item)}
              style={styles.item}
            >
              <Text>{item.display_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
    width: "100%"
  },
  input: {
    backgroundColor: "#f1f1f1",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 44,
    fontSize: 16
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  }
});
