import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TextInput, Alert } from 'react-native';
import { Text } from '@components/Themed';
import { TileButton } from '@components/TileButton';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useAuth } from '@context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { API } from '@services/api';
import { LibraryAsset, Programme, CurriculumUnit } from '../types/models';
import Colors from '@theme/Colors';

type LibraryScreenProps = StackScreenProps<RootStackParamList, 'Library'>;

const LibraryScreen: React.FC<LibraryScreenProps> = () => {
  const { state } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);

  // Fetch library assets (can add filters for programme_id, unit_id, etc.)
  const { data: assetsData, isLoading, error } = useQuery<LibraryAsset[]>(
    ['libraryAssets', searchQuery],
    () => API.getLibraryAssets({ search: searchQuery }), // Assuming a search parameter in the API
    {
      onSuccess: (data) => setLibraryAssets(data),
      onError: (err) => Alert.alert('Error', 'Failed to fetch library assets.'),
    }
  );

  useEffect(() => {
    if (assetsData) {
      setLibraryAssets(assetsData);
    }
  }, [assetsData]);

  const handleUploadAsset = () => {
    Alert.alert('Upload Asset', 'This functionality is not yet implemented.');
    // TODO: Implement asset upload logic
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading Library...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Library</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search assets..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor={Colors.gray}
      />

      <TileButton title="Upload New Asset" onPress={handleUploadAsset} icon="cloud-upload" style={styles.uploadButton} />

      <Text style={styles.sectionTitle}>Available Assets</Text>
      {libraryAssets.length === 0 ? (
        <Text>No library assets found.</Text>
      ) : (
        libraryAssets.map((asset) => (
          <View key={asset.id} style={styles.assetItem}>
            <Text style={styles.assetTitle}>{asset.title}</Text>
            <Text style={styles.assetDetails}>Type: {asset.type}</Text>
            <Text style={styles.assetDetails}>URL: {asset.url}</Text>
            {/* TODO: Display tags, programme/unit visibility */}
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.light.text,
  },
  searchInput: {
    height: 40,
    borderColor: Colors.light.text,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    color: Colors.light.text,
  },
  uploadButton: {
    marginBottom: 20,
    backgroundColor: Colors.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: Colors.light.text,
  },
  assetItem: {
    backgroundColor: Colors.light.cardBackground,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  assetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  assetDetails: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 5,
  },
});

export default LibraryScreen;
