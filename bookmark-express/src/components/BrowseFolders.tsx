import React, { useEffect, useState, MouseEvent } from 'react'
import { IconButton } from '@mui/material'
import { styled } from '@mui/material/styles'
import { TreeView } from '@mui/x-tree-view'
import { TreeItem } from '@mui/x-tree-view'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { getFolders, isFolder } from 'utils/misc'
import { Favorite, Node } from 'react-app-env'
import StarIcon from '@mui/icons-material/Star'
import StarOutlineIcon from '@mui/icons-material/StarOutline'

interface Props {
    favoriteFolders?: Favorite[]
    mode: 'browse' | 'favorites'
    onFolderSelect: (folder: Node, event: MouseEvent<HTMLElement>) => void
}

const StyledTreeView = styled(TreeView)(() => ({
    width: '100%',
}))

const StyledTreeItem = styled(TreeItem)(() => ({
    '& .MuiTreeItem-label': {
        display: 'flex',
        alignItems: 'center',
        minHeight: '40px',
    },
    '&.MuiTreeItem-root.Mui-selected:focus > .MuiTreeItem-content .MuiTreeItem-label': {
        backgroundColor: '#3f51b5',
        color: 'white',
        borderRadius: '4px',
    }
}))

export function BrowseFolders({ favoriteFolders = [], mode, onFolderSelect }: Props) {
    const [allFolders, setAllFolders] = useState<Node>()

    useEffect(() => {
        async function fetchFolders() {
            const folders = await getFolders()
            setAllFolders(folders)
        }

        fetchFolders()
    }, [])

    const renderTree = (node: Node | undefined) => {
        if (!node || !isFolder(node)) return null

        const isFolderFavorited = favoriteFolders.some((favorite) => favorite.id === node.id)

        return (
            <StyledTreeItem
                key={node.id}
                nodeId={node.id}
                label={
                    <>
                        {node.title}
                        {mode === 'favorites' && (
                            <IconButton tabIndex={-1} onClick={(event: MouseEvent<HTMLElement>) => onFolderSelect(node, event)}>
                                {isFolderFavorited ? (
                                    <StarIcon fontSize='small' />
                                ) : (
                                    <StarOutlineIcon fontSize='small' />
                                )}
                            </IconButton>
                        )}
                    </>
                }
                onClick={mode === 'browse' ? (event: MouseEvent<HTMLElement>) => onFolderSelect(node, event) : undefined}
            >
                {Array.isArray(node.children) ? node.children.map((node) => renderTree(node)) : null}
            </StyledTreeItem>
        )
    }

    return (
        <StyledTreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            defaultExpanded={['0']}
        >
            {/* Call for each permanent child folder Chromium requires so we can omit the root node */}
            {renderTree(allFolders?.children?.[0])}
            {renderTree(allFolders?.children?.[1])}
            {renderTree(allFolders?.children?.[2])}
        </StyledTreeView>
    )
}
