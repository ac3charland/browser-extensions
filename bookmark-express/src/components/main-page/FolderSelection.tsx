import React, { useEffect, useState } from 'react'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Chip,
    Grid,
    Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { getFolders, getRecentFolders } from 'utils/misc'
import { Favorite, Node } from 'react-app-env'
import { Bookmarks } from 'webextension-polyfill-ts'
import { BrowseFolders } from 'components/BrowseFolders'
import { getFavorites } from '../../utils/storage'

interface Props {
    createDetails: Bookmarks.CreateDetails
    onFolderSelect: (folder: Node) => void
}

const StyledAccordion = styled(Accordion)({
    border: '1px solid rgba(0, 0, 0, .125)',
    boxShadow: 'none',
    '&:not(:last-child)': {
        borderBottom: 0,
    },
    '&:before': {
        display: 'none',
    },
    '&.Mui-expanded': {
        margin: 'auto',
    },
})

const StyledAccordionSummary = styled(AccordionSummary)({
    backgroundColor: 'rgba(0, 0, 0, .03)',
    borderBottom: '1px solid rgba(0, 0, 0, .125)',
    minHeight: 56,
    '&.Mui-expanded': {
        minHeight: 56,
    },
    '& .MuiAccordionSummary-content.Mui-expanded': {
        margin: '12px 0',
    },
})

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
    padding: theme.spacing(2),
}))

const StyledRecentFolders = styled('div')(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    '& > *': {
        margin: theme.spacing(0.5),
    },
}))

const NoFavoritesTypography = styled(Typography)({
    color: 'gray',
})

export function FolderSelection({ createDetails, onFolderSelect }: Props) {
    const [recentFolders, setRecentFolders] = useState<Node[]>([])
    const [favorites, setFavorites] = useState<Favorite[]>([])
    const [expanded, setExpanded] = React.useState('')

    useEffect(() => {
        async function fetchFolders() {
            setRecentFolders(getRecentFolders(await getFolders()))
            setFavorites(await getFavorites())
        }

        fetchFolders()
    }, [])

    const handleToggleAccordion = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : '')
    }

    return (
        <>
            <StyledAccordion expanded={expanded === 'panel1'} onChange={handleToggleAccordion('panel1')}>
                <StyledAccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Favorite Folders</Typography>
                </StyledAccordionSummary>
                <StyledAccordionDetails>
                    {!favorites.length && (
                        <Grid container sx={{ justifyContent: 'center' }}>
                            <NoFavoritesTypography>
                                You can add folders to your favorites in the options
                            </NoFavoritesTypography>
                        </Grid>
                    )}
                    {favorites.map((folder) => (
                        <Chip
                            key={folder.id}
                            label={folder.title}
                            color={folder.id === createDetails.parentId ? 'primary' : 'default'}
                            onClick={() => onFolderSelect(folder)}
                        />
                    ))}
                </StyledAccordionDetails>
            </StyledAccordion>

            <StyledAccordion expanded={expanded === 'panel2'} onChange={handleToggleAccordion('panel2')}>
                <StyledAccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Recently Used Folders</Typography>
                </StyledAccordionSummary>
                <StyledAccordionDetails>
                    <StyledRecentFolders>
                        {recentFolders.map((folder) => (
                            <Chip
                                key={folder.id}
                                label={folder.title}
                                color={folder.id === createDetails.parentId ? 'primary' : 'default'}
                                onClick={() => onFolderSelect(folder)}
                            />
                        ))}
                    </StyledRecentFolders>
                </StyledAccordionDetails>
            </StyledAccordion>

            <StyledAccordion expanded={expanded === 'panel3'} onChange={handleToggleAccordion('panel3')}>
                <StyledAccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Browse Folders</Typography>
                </StyledAccordionSummary>
                <StyledAccordionDetails>
                    <BrowseFolders mode='browse' onFolderSelect={onFolderSelect} />
                </StyledAccordionDetails>
            </StyledAccordion>
        </>
    )
}
