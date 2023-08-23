import { SBox, SFlatList, SHStack, SIcon, SImage, SText } from '@components/core';
import { StyleSheet, TouchableOpacity } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
import PlaceholderImage from '@assets/placeholder-image.png';
import { MaterialIcons } from '@expo/vector-icons';
import { Orientation } from 'expo-screen-orientation';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import withObservables from '@nozbe/with-observables';
import { EnhancedCharacterizationPhoto } from './CharacterizationPhoto';
import { CharacterizationPhotoModel } from '@libs/watermelon/model/CharacterizationPhotoModel';
import { characterizationMap } from '@constants/maps/characterization.map';
import { Badge } from 'native-base';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import EnhancedCharacterizationCard from './CharacterizationCard';

type Props = {
    characterizations: CharacterizationModel[];
};

export function CharacterizationList({ characterizations }: Props): React.ReactElement {
    return (
        <SFlatList
            data={characterizations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <EnhancedCharacterizationCard characterization={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 8 }}
        />
    );
}

const enhance = withObservables(['workspace'], ({ workspace }) => {
    return { characterizations: workspace.characterizations };
});

const EnhancedCharacterizationList = enhance(CharacterizationList);
export default EnhancedCharacterizationList;
