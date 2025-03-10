import React, { ChangeEvent, useEffect, useState } from 'react'
import { Avatar, Button, Grid, InputAdornment, Paper, TextField } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Bookmarks, browser, Tabs } from 'webextension-polyfill-ts'
import { FolderSelection } from './FolderSelection'
import { Node } from 'react-app-env'

const StyledTextField = styled(TextField)(({ theme }) => ({
    '&.Mui-focused fieldset': {
        borderColor: '#3f51b5 !important',
    },
    marginBottom: theme.spacing(2),
}))

const StyledPaper = styled(Paper)(({ theme }) => ({
    marginTop: theme.spacing(1),
    padding: theme.spacing(2),
}))

const SectionContainer = styled('div')(({ theme }) => ({
    marginBottom: theme.spacing(2),
}))

export function EditBookmark() {
    const [activeTab, setActiveTab] = useState<Tabs.Tab>()
    const [createDetails, setCreateDetails] = useState<Bookmarks.CreateDetails>({})

    useEffect(() => {
        ;(async () => {
            const tab = (await browser.tabs.query({ active: true }))[0]

            setActiveTab(tab)
            setCreateDetails({
                title: tab.title,
                url: tab.url,
            })
        })()
    }, [])

    const handleTextChange = (event: ChangeEvent<HTMLInputElement>, key: string) => {
        setCreateDetails((prevState) => ({
            ...prevState,
            [key]: event.target.value,
        }))
    }

    const handleSelectFolder = (folder: Node) => {
        setCreateDetails((prevState) => ({
            ...prevState,
            parentId: folder.id,
        }))
    }

    const handleAddBookmark = async () => {
        if (!createDetails) return
        await browser.bookmarks.create(createDetails)
        window.close()
    }

    return (
        <StyledPaper elevation={3}>
            <Grid container>
                <Grid item xs={12}>
                    <StyledTextField
                        fullWidth
                        variant='outlined'
                        value={createDetails?.title}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <Avatar src={activeTab?.favIconUrl} />
                                </InputAdornment>
                            ),
                        }}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => handleTextChange(event, 'title')}
                    />
                    <StyledTextField
                        fullWidth
                        multiline
                        rows={4}
                        variant='outlined'
                        value={createDetails?.url}
                        InputLabelProps={{ shrink: true }}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => handleTextChange(event, 'url')}
                    />
                    <SectionContainer>
                        <FolderSelection createDetails={createDetails} onFolderSelect={handleSelectFolder} />
                    </SectionContainer>
                    <Button variant='contained' color='primary' onClick={handleAddBookmark}>
                        Add Bookmark
                    </Button>
                </Grid>
            </Grid>
        </StyledPaper>
    )
}
