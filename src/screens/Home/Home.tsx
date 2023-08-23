import { SHomeHeader } from '@components/index';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { SVStack, useSToast } from '@components/core';
import { useState } from 'react';

export const Home = () => {
    const [isLoading, setIsLoading] = useState(true);

    const { navigate } = useNavigation<AppNavigatorRoutesProps>();
    const toast = useSToast();

    // const handleOpenExerciseDetail = (id: number) => {
    //   navigate('exercise', { id });
    // };

    return (
        <SVStack flex={1}>
            <SHomeHeader />
            {/* <FlatList
        data={groups}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Group
            name={item}
            isActive={groupSelected.toLocaleUpperCase() === item.toLocaleUpperCase()}
            onPress={() => {
              setGroupSelected(item);
            }}
          />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        _contentContainerStyle={{ px: 8 }}
        my={10}
        maxH={10}
        minH={10}
      /> */}
        </SVStack>
    );
};
