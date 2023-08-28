import { SBox, SText } from '@components/core';
import { SInput } from '@components/modelucules';
import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet } from 'react-native';

interface PageProps<T> {
    onSearch: (text: string) => Promise<T[]>;
}

export function SearchDropDown<T>({ onSearch }: PageProps<T>) {
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<T[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const handleSearch = async () => {
        try {
            const data = await onSearch(searchText);

            setSearchResults(data);
            setShowDropdown(true); // Show dropdown when results are available
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        if (searchText === '') {
            setShowDropdown(false); // Hide dropdown when search text is empty
        }
    }, [searchText]);

    return (
        <SBox>
            <SInput
                placeholder="Search..."
                value={searchText}
                onChangeText={(text) => {
                    setSearchText(text);
                    handleSearch(); // Start searching as user types
                }}
                onBlur={() => setShowDropdown(false)} // Hide dropdown on blur
            />
            {showDropdown && ( // Conditional rendering for dropdown
                <SBox style={styles.dropdownContainer}>
                    <FlatList
                        data={searchResults}
                        renderItem={({ item }) => <SText>{item.name}</SText>}
                        keyExtractor={(item) => item.id.toString()}
                    />
                </SBox>
            )}
        </SBox>
    );
}

const styles = StyleSheet.create({
    dropdownContainer: {
        backgroundColor: 'white',
        elevation: 4, // For shadow on Android
        position: 'absolute',
        zIndex: 1, // To ensure the dropdown appears above other content
        // top: /* Set the appropriate value to position the dropdown */,
        // left: /* Set the appropriate value to position the dropdown */,
        // width: /* Set the appropriate width */,
        // maxHeight: /* Set the appropriate max height */,
    },
});
