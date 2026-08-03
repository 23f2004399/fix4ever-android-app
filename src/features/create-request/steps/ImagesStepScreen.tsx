import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Image,
  Dimensions,
  PermissionsAndroid,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { launchImageLibrary, launchCamera, MediaType, ImagePickerResponse, ImageLibraryOptions, CameraOptions } from 'react-native-image-picker';

import Feather from 'react-native-vector-icons/Feather';

import { useTheme } from '../../../core/theme';
import { FormData } from '../ServiceRequestStack';

interface ImagesStepScreenProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
  onNext: () => void;
  onBack: () => void;
  showPopup: (title: string, message: string, variant?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function ImagesStepScreen({
  formData,
  updateFormData,
  errors,
  onNext,
  onBack,
  showPopup,
}: ImagesStepScreenProps) {
  const { colors, spacing, typography } = useTheme();
  const [selectedImages, setSelectedImages] = useState<File[]>(formData.issueImages || []);
  const [imageUris, setImageUris] = useState<string[]>(formData.issueImages.map((file: any) => file.uri) || []);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const showImagePickerModal = () => {
    setShowImagePicker(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 8,
    }).start();
  };

  const hideImagePickerModal = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 8,
    }).start(() => {
      setShowImagePicker(false);
    });
  };

  const handleImagePicker = () => {
    showImagePickerModal();
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to take photos of the issue.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission error:', err);
        return false;
      }
    }
    return true; // iOS permissions are handled by the library
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'This app needs access to your storage to select photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Storage permission error:', err);
        return false;
      }
    }
    return true; // iOS permissions are handled by the library
  };

  const openCamera = async () => {
    hideImagePickerModal();
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showPopup('Permission Denied', 'Camera permission is required to take photos', 'error');
      return;
    }

    const options: CameraOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 600,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        if (asset.uri) {
          addImageToState(asset.uri, asset.fileName || `camera_${Date.now()}.jpg`);
        }
      }
    });
  };

  const openGallery = async () => {
    hideImagePickerModal();
    
    // NO PERMISSION CHECK NEEDED for modern Android!
    // The system Photo Picker handles permissions automatically
    
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 600,
      selectionLimit: 5 - selectedImages.length,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets) {
        // Calculate how many images we can add
        const remainingSlots = 5 - selectedImages.length;
        const assetsToAdd = response.assets.slice(0, remainingSlots);
        
        if (assetsToAdd.length === 0) {
          showPopup('Limit Reached', 'You can add up to 5 images only', 'warning');
          return;
        }
        
        // Create File objects for React Native
        const newFiles: File[] = [];
        const newUris: string[] = [];
        
        assetsToAdd.forEach(asset => {
          if (asset.uri) {
            const file = {
              uri: asset.uri,
              type: asset.type || 'image/jpeg',
              name: asset.fileName || `image_${Date.now()}.jpg`,
            } as unknown as File;
            
            newFiles.push(file);
            newUris.push(asset.uri);
          }
        });
        
        if (newFiles.length > 0) {
          const updatedFiles = [...selectedImages, ...newFiles];
          const updatedUris = [...imageUris, ...newUris];
          
          setSelectedImages(updatedFiles);
          setImageUris(updatedUris);
          updateFormData('issueImages', updatedFiles);
        }
        
        // Show warning if some images were skipped due to limit
        if (response.assets.length > remainingSlots) {
          showPopup(
            'Some Images Skipped',
            `Only ${remainingSlots} more images can be added (maximum 5 total).`,
            'warning'
          );
        }
      }
    });
  };

  const addImageToState = (uri: string, fileName: string) => {
    if (selectedImages.length >= 5) {
      showPopup('Limit Reached', 'You can add up to 5 images only', 'warning');
      return;
    }

    // Create File object for React Native
    const file = {
      uri: uri,
      type: 'image/jpeg',
      name: fileName || `camera_${Date.now()}.jpg`,
    } as unknown as File;

    const newFiles = [...selectedImages, file];
    const newUris = [...imageUris, uri];
    
    setSelectedImages(newFiles);
    setImageUris(newUris);
    updateFormData('issueImages', newFiles);

    console.log('Added file:', file);
    console.log('Total files:', newFiles.length);
  };

  const removeImage = (index: number) => {
    const newFiles = selectedImages.filter((_, i) => i !== index);
    const newUris = imageUris.filter((_, i) => i !== index);
    
    setSelectedImages(newFiles);
    setImageUris(newUris);
    updateFormData('issueImages', newFiles);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    } as ViewStyle,
    scroll: {
      flex: 1,
    } as ViewStyle,
    scrollContent: {
      padding: spacing.md,
    } as ViewStyle,
    section: {
      marginBottom: spacing.lg,
    } as ViewStyle,
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.foreground,
      marginBottom: spacing.md,
    } as TextStyle,
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: spacing.md,
    } as TextStyle,
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: spacing.md,
      fontSize: 16,
      color: colors.foreground,
      backgroundColor: colors.background,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderStyle: 'dashed' as const,
      minHeight: 100,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    } as ViewStyle,
    addImagesText: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center' as const,
    } as TextStyle,
    imagesContainer: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      marginTop: spacing.md,
    } as ViewStyle,
    imageWrapper: {
      width: (Dimensions.get('window').width - spacing.md * 2 - spacing.sm * 2) / 3,
      height: (Dimensions.get('window').width - spacing.md * 2 - spacing.sm * 2) / 3,
      position: 'relative' as const,
      borderRadius: 18,
      overflow: 'hidden' as const,
    } as ViewStyle,
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover' as const,
    } as ImageStyle,
    removeButton: {
      position: 'absolute' as const,
      top: 4,
      right: 4,
      backgroundColor: 'rgba(1, 50, 93, 0.85)',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    } as ViewStyle,
    removeButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold' as const,
    } as TextStyle,
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end' as const,
    } as ViewStyle,
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    } as ViewStyle,
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.lg,
    } as ViewStyle,
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.foreground,
    } as TextStyle,
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center' as const,
      marginBottom: spacing.lg,
    } as ViewStyle,
    optionButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.background,
      padding: spacing.md,
      borderRadius: 18,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    } as ViewStyle,
    optionIcon: {
      fontSize: 24,
      marginRight: spacing.md,
    } as TextStyle,
    optionText: {
      fontSize: 16,
      fontWeight: '500' as const,
      color: colors.foreground,
    } as TextStyle,
    cancelButton: {
      backgroundColor: colors.background,
      padding: spacing.md,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: spacing.sm,
    } as ViewStyle,
    cancelText: {
      fontSize: 16,
      fontWeight: '500' as const,
      color: colors.mutedForeground,
      textAlign: 'center' as const,
    } as TextStyle,
  });

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Images (Optional)</Text>
          <Text style={styles.subtitle}>
            Add photos showing the issue (up to 5 images, Max 2MB per photo)
          </Text>
          
          {imageUris.length > 0 && (
            <View style={styles.imagesContainer}>
              {imageUris.map((imageUrl, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: imageUrl }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              
              {selectedImages.length < 5 && (
                <TouchableOpacity
                  style={[styles.imageWrapper, styles.input]}
                  onPress={handleImagePicker}
                >
                  <Text style={styles.addImagesText}>+ Add</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {imageUris.length === 0 && (
            <TouchableOpacity
              style={styles.input}
              onPress={handleImagePicker}
            >
              <Text style={styles.addImagesText}>+ Add Images</Text>
            </TouchableOpacity>
          )}
          
          <Text style={styles.subtitle}>
            {selectedImages.length}/5 images added
          </Text>
        </View>
      </ScrollView>

      {/* Custom Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="none"
        onRequestClose={hideImagePickerModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hideImagePickerModal}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Photos</Text>
            </View>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={openCamera}
            >
              <Feather name="camera" size={24} />
              <Text style={styles.optionText}> Take a Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={openGallery}
            >
              <Feather name="image" size={24} />
              <Text style={styles.optionText}> Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={hideImagePickerModal}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}