import React, { useEffect, useState } from 'react'
import { CircularProgress, Container } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Results } from './Results'
import { SearchBar } from './SearchBar'
import AppContext from 'context/AppContext'
import { buildMetadata } from 'utils/metadata'
import { getMetadata, getUserOptions } from 'utils/storage'
import { useAppContext } from 'utils/hooks'
import { EditBookmark } from './EditBookmark'

interface Props {
    isMetadataStale: boolean
}

const LoadingContainer = styled(Container)({
    textAlign: 'center',
    padding: '10px',
})

export function MainPage({ isMetadataStale }: Props) {
    const context = useAppContext()
    const [isLoading, setIsLoading] = useState<boolean>(true)

    const setMetadata = context.setMetadata
    const setUserOptions = context.setUserOptions

    useEffect(() => {
        ;(async () => {
            if (isMetadataStale) {
                console.log(777, 'Changes to bookmarks detected... rebuilding metadata cache')
                setMetadata(await buildMetadata())
            } else {
                setMetadata(await getMetadata())
            }

            setUserOptions(await getUserOptions())
            setIsLoading(false)
        })()
    }, [isMetadataStale, setMetadata, setUserOptions])

    let view

    switch (context.viewMode) {
        case 'add':
            view = <EditBookmark />
            break
        case 'recent':
        case 'search':
            view = <Results />
            break
        default:
            view = null
    }

    return (
        <AppContext.Provider value={context}>
            {isLoading && (
                <LoadingContainer disableGutters>
                    <CircularProgress />
                </LoadingContainer>
            )}
            {!isLoading && (
                <Container disableGutters>
                    <SearchBar />
                    {view}
                </Container>
            )}
        </AppContext.Provider>
    )
}
