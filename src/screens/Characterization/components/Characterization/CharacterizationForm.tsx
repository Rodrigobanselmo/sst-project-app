import { SBox, SHStack, SScrollView, SVStack } from '@components/core';
import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { CharacterizationFormProps } from '../../types';
// import * as ImagePicker from 'expo-image-picker';
import { SButton, SInput, SInputArea } from '@components/index';
import { SLabel } from '@components/modelucules/SLabel';
import { SRadio } from '@components/modelucules/SRadio';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { characterizationMap } from '@constants/maps/characterization.map';
import { useCharacterizationFormStore } from '@libs/storage/state/characterization/characterization.store';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { Control, Controller } from 'react-hook-form';
import { ICharacterizationValues } from '../../schemas';
import { AudioForm } from './forms/AudioForm';
import { PhotoForm } from './forms/PhotoForm';
import { ProfileForm } from './forms/ProfileForm';
import { VideoForm } from './forms/VideoForm';

type PageProps = {
    openCamera: () => void;
    onEditForm: (form: Partial<CharacterizationFormProps>) => void;
    onSaveForm: () => Promise<any>;
    control: Control<ICharacterizationValues, any>;
    characterizationsProfiles?: CharacterizationModel[];
    principalProfileId?: string;
    onChangeProfile: (characterzationId: string) => Promise<void>;
    onAddProfile: (options: { refetchProfiles: () => void }) => Promise<void>;
};

export function CharacterizationForm({
    openCamera,
    onEditForm,
    onSaveForm,
    control,
    principalProfileId,
    characterizationsProfiles,
    onChangeProfile,
    onAddProfile,
}: PageProps): React.ReactElement {
    const isPrincipalProfile = useCharacterizationFormStore((state) => state.getIsPrincipalProfile());

    const handleSave = () => {
        onSaveForm();
    };

    const environments = [
        {
            label: 'Amb. ' + characterizationMap[CharacterizationTypeEnum.GENERAL].name,
            value: CharacterizationTypeEnum.GENERAL,
        },
        {
            label: 'Amb. ' + characterizationMap[CharacterizationTypeEnum.ADMINISTRATIVE].name,
            value: CharacterizationTypeEnum.ADMINISTRATIVE,
        },
        {
            label: 'Amb. ' + characterizationMap[CharacterizationTypeEnum.OPERATION].name,
            value: CharacterizationTypeEnum.OPERATION,
        },
        {
            label: 'Amb. ' + characterizationMap[CharacterizationTypeEnum.SUPPORT].name,
            value: CharacterizationTypeEnum.SUPPORT,
        },
    ];

    const characterization = [
        {
            label: characterizationMap[CharacterizationTypeEnum.WORKSTATION].name,
            value: CharacterizationTypeEnum.WORKSTATION,
        },
        {
            label: characterizationMap[CharacterizationTypeEnum.ACTIVITIES].name,
            value: CharacterizationTypeEnum.ACTIVITIES,
        },

        {
            label: characterizationMap[CharacterizationTypeEnum.EQUIPMENT].name,
            value: CharacterizationTypeEnum.EQUIPMENT,
        },
    ];

    const profileOptions = [
        { value: principalProfileId || '', name: 'Principal' },
        ...(characterizationsProfiles || []).map((profile) => ({
            value: profile.id,
            name: profile.profileName || 'Novo Perfil',
        })),
    ];

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <SVStack flex={1}>
                <SScrollView
                    style={{ paddingTop: 15 }}
                    contentContainerStyle={{ paddingBottom: 10 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* NAME & TYPE */}
                    <SVStack mx={pagePadding}>
                        {/* <SLabel>Dados</SLabel> */}
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, value }, formState: { errors } }) => (
                                <SInput
                                    inputProps={{
                                        placeholder: '',
                                        keyboardType: 'default',
                                        autoCapitalize: 'sentences',
                                        value,
                                        onChangeText: onChange,
                                        autoFocus: true,
                                    }}
                                    isDisabled={!isPrincipalProfile}
                                    startAdornmentText="Nome"
                                    errorMessage={errors.name?.message}
                                />
                            )}
                        />

                        <SScrollView keyboardShouldPersistTaps="handled" horizontal>
                            <SHStack>
                                <SBox mr={5}>
                                    <Controller
                                        defaultValue={'' as any}
                                        control={control}
                                        name="type"
                                        render={({ field, formState: { errors } }) => (
                                            <SRadio
                                                isDisabled={!isPrincipalProfile}
                                                value={field.value}
                                                sizeRadio={'sm'}
                                                name={field.name}
                                                onChange={(val) => field.onChange(val)}
                                                options={environments}
                                                errorMessage={errors.type?.message}
                                                accessibilityLabel="Tipo de ambiente"
                                            />
                                        )}
                                    />
                                </SBox>
                                <Controller
                                    defaultValue={'' as any}
                                    control={control}
                                    name="type"
                                    render={({ field, formState: { errors } }) => (
                                        <SRadio
                                            isDisabled={!isPrincipalProfile}
                                            value={field.value}
                                            name={field.name}
                                            onChange={(val) => field.onChange(val)}
                                            sizeRadio={'sm'}
                                            options={characterization}
                                            errorMessage={errors.type?.message}
                                            accessibilityLabel="Outros tipo"
                                        />
                                    )}
                                />
                            </SHStack>
                        </SScrollView>
                    </SVStack>

                    {/* PROFILE */}
                    <SVStack mx={pagePadding} mt={0}>
                        <ProfileForm onAddProfile={onAddProfile} onChangeProfile={onChangeProfile} />

                        {!isPrincipalProfile && (
                            <Controller
                                control={control}
                                name="profileName"
                                render={({ field: { onChange, value }, formState: { errors } }) => (
                                    <SInput
                                        inputProps={{
                                            placeholder: '',
                                            keyboardType: 'default',
                                            autoCapitalize: 'none',
                                            value,
                                            onChangeText: onChange,
                                        }}
                                        startAdornmentText="Nome do perfil"
                                        errorMessage={errors.profileName?.message}
                                    />
                                )}
                            />
                        )}
                    </SVStack>

                    {/* PHOTO */}
                    <PhotoForm onEdit={onEditForm} openCamera={openCamera} />

                    {/* PARAMETHERS */}
                    <SVStack mx={pagePadding} mt={5}>
                        <SLabel>Parâmetros ambientais</SLabel>
                        <SHStack>
                            <SBox flex={1} mr={4}>
                                <Controller
                                    control={control}
                                    name="temperature"
                                    render={({ field: { onChange, value }, formState: { errors } }) => (
                                        <SInput
                                            inputProps={{
                                                placeholder: 'Temperatura',
                                                keyboardType: 'numeric',
                                                value,
                                                onChangeText: onChange,
                                            }}
                                            endAdornmentText={'ºC'}
                                            errorMessage={errors.temperature?.message}
                                        />
                                    )}
                                />
                            </SBox>
                            <SBox flex={1}>
                                <Controller
                                    control={control}
                                    name="noiseValue"
                                    render={({ field: { onChange, value }, formState: { errors } }) => (
                                        <SInput
                                            inputProps={{
                                                placeholder: 'Ruído',
                                                keyboardType: 'numeric',
                                                value,
                                                onChangeText: onChange,
                                            }}
                                            endAdornmentText={'db (A)'}
                                            errorMessage={errors.noiseValue?.message}
                                        />
                                    )}
                                />
                            </SBox>
                        </SHStack>
                        <SHStack>
                            <SBox flex={1} mr={4}>
                                <Controller
                                    control={control}
                                    name="moisturePercentage"
                                    render={({ field: { onChange, value }, formState: { errors } }) => (
                                        <SInput
                                            inputProps={{
                                                placeholder: 'Humidade',
                                                keyboardType: 'numeric',
                                                value,
                                                onChangeText: onChange,
                                            }}
                                            endAdornmentText={'%'}
                                            errorMessage={errors.moisturePercentage?.message}
                                        />
                                    )}
                                />
                            </SBox>
                            <SBox flex={1}>
                                <Controller
                                    control={control}
                                    name="luminosity"
                                    render={({ field: { onChange, value }, formState: { errors } }) => (
                                        <SInput
                                            inputProps={{
                                                placeholder: 'Iluminância',
                                                keyboardType: 'numeric',
                                                value,
                                                onChangeText: onChange,
                                            }}
                                            endAdornmentText={'LUX'}
                                            errorMessage={errors.luminosity?.message}
                                        />
                                    )}
                                />
                            </SBox>
                        </SHStack>
                    </SVStack>

                    {/* DESCRIPTION */}
                    <SVStack mt={3} mx={pagePadding}>
                        {/* <SLabel mr={2}>Descrição</SLabel> */}
                        <Controller
                            control={control}
                            name="description"
                            render={({ field: { onChange, value }, formState: { errors } }) => (
                                <SInputArea
                                    inputProps={{
                                        placeholder: '',
                                        keyboardType: 'default',
                                        value,
                                        onChangeText: onChange,
                                    }}
                                    h={300}
                                    startAdornmentText="Anotações"
                                    errorMessage={errors.description?.message}
                                />
                            )}
                        />
                    </SVStack>

                    <VideoForm onEdit={onEditForm} />
                    <AudioForm onEdit={onEditForm} />

                    <SVStack mb={SAFE_AREA_PADDING.paddingBottom} mt={5} mx={pagePadding}>
                        <SButton size={'sm'} title="Salvar" onPress={handleSave} />
                    </SVStack>
                </SScrollView>
            </SVStack>
        </KeyboardAvoidingView>
    );
}
