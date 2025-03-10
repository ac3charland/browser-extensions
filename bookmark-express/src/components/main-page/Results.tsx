import React, { useContext } from 'react'
import {
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import AppContext from 'context/AppContext'
import { highlightText, isFolder } from 'utils/misc'
import { saveMetadata } from 'utils/storage'
import { ResultActions } from './ResultActions'
import { Node } from 'react-app-env'

const TitleDiv = styled('div')({
    '& .search-hit': {
        backgroundColor: '#3f51b5',
        color: 'white',
    },
})

const UrlDiv = styled('div')({
    fontSize: '12px',
    fontStyle: 'italic',
    color: 'gray',
    wordBreak: 'break-all',
    '& .search-hit': {
        backgroundColor: '#3f51b5',
        color: 'white',
    },
})

const StyledListItem = styled(ListItem, {
    shouldForwardProp: (prop) => prop !== 'justDeleted',
})<{ justDeleted?: boolean }>(({ justDeleted }) => ({
    opacity: justDeleted ? 0.2 : 1,
}))

export function Results() {
    const context = useContext(AppContext)

    if (!context.results.length) return null

    async function handleOpenBookmark(bookmark: Node) {
        // Updating directly being the extension closes after this anyway
        context.metadata.bookmarks[bookmark.id].timesAccessed++
        await saveMetadata(context.metadata)

        window.open(bookmark.url)
    }

    let bookmarks: Node[] = context.results.filter((bookmark: Node) => !isFolder(bookmark))

    if (context.viewMode === 'search') {
        bookmarks = bookmarks.sort(
            (a, b) => context.metadata.bookmarks[b.id].timesAccessed - context.metadata.bookmarks[a.id].timesAccessed
        )
    }

    return (
        <List>
            {bookmarks.map((bookmark) => {
                const metaForResult = context.metadata.bookmarks[bookmark.id]
                const titleWithHighlights = highlightText(bookmark.title, context.query)
                const urlWithHighlights = highlightText(bookmark.url ?? '', context.query)

                return (
                    <StyledListItem
                        justDeleted={metaForResult.justDeleted}
                        key={bookmark.id}
                        onClick={() => handleOpenBookmark(bookmark)}
                        sx={{ cursor: 'pointer' }}
                    >
                        <ListItemAvatar>
                            <Avatar src={`chrome://favicon/${bookmark.url}`} />
                        </ListItemAvatar>
                        <ListItemText secondary={context.userOptions.showBreadcrumbs && metaForResult.breadcrumbs}>
                            <>
                                <TitleDiv
                                    dangerouslySetInnerHTML={{ __html: titleWithHighlights }}
                                />
                                {context.userOptions.showUrls && (
                                    <UrlDiv
                                        dangerouslySetInnerHTML={{ __html: urlWithHighlights }}
                                    />
                                )}
                            </>
                        </ListItemText>
                        <ListItemSecondaryAction>
                            <ResultActions bookmarkId={bookmark.id} />
                        </ListItemSecondaryAction>
                    </StyledListItem>
                )
            })}
        </List>
    )
}
