import { SButton, SScreenHeader } from '@components/index';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { SVStack, useSToast } from '@components/core';
import { useState } from 'react';

export const Task = () => {
    const [isLoading, setIsLoading] = useState(true);

    const { navigate } = useNavigation<AppNavigatorRoutesProps>();
    const toast = useSToast();

    const handleCreateCharacterization = () => {
        navigate('characterization', {});
    };

    // const fetchGroups = async () => {
    //   try {
    //     const { data } = await api.get('/groups');
    //     setGroups(data);
    //   } catch (error) {
    //     const isAppError = error instanceof AppError;
    //     const message = isAppError ? error.message : 'Erro ao buscar grupos musculares. Tente novamente mais tarde.';
    //     toast.show({
    //       title: 'Erro ao buscar grupos musculares',
    //       description: message,
    //       placement: 'top',
    //       bgColor: 'status.error',
    //     });
    //   }
    // };

    // const fetchExercisesByGroup = async () => {
    //   try {
    //     setIsLoading(true);
    //     const { data } = await api.get(`/exercises/bygroup/${groupSelected}`);
    //     setExercises(data);
    //   } catch (error) {
    //     const isAppError = error instanceof AppError;
    //     const message = isAppError ? error.message : 'Erro ao buscar exercícios. Tente novamente mais tarde.';
    //     toast.show({
    //       title: 'Erro ao buscar exercícios',
    //       description: message,
    //       placement: 'top',
    //       bgColor: 'status.error',
    //     });
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };

    // useEffect(() => {
    //   fetchGroups();
    // }, []);

    // useFocusEffect(
    //   useCallback(() => {
    //     fetchExercisesByGroup();
    //   }, [groupSelected]),
    // );

    return (
        <SVStack flex={1}>
            <SScreenHeader title="Atividade" />
            <SButton mt={10} title="Criar conta" variant="outline" onPress={handleCreateCharacterization} />
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
