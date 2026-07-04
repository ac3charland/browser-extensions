// A run of text that either matches the search query (hit) or doesn't.
export interface Segment {
    text: string
    hit: boolean
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Splits `sourceText` into highlighted / non-highlighted segments based on the
// query. Ported from the old ResultsView.addSearchHitHighlights, but instead of
// returning an HTML string (which the Backbone version injected raw via Mustache
// `{{&...}}`), we return structured segments. Svelte renders them as real text
// nodes, so bookmark titles/URLs can never inject markup.
export function highlight(sourceText: string, searchQuery: string): Segment[] {
    if (!sourceText) return []

    const parts = searchQuery
        .trim()
        .split(/\s+/)
        .filter((part) => part.length > 1)

    if (parts.length === 0) return [{ text: sourceText, hit: false }]

    // One case-insensitive regex that matches any query part, capturing the
    // match so split() keeps the matched text in the resulting array.
    const pattern = new RegExp('(' + parts.map(escapeRegExp).join('|') + ')', 'gi')
    const lowerParts = parts.map((part) => part.toLowerCase())

    return sourceText
        .split(pattern)
        .filter((chunk) => chunk.length > 0)
        .map((chunk) => ({
            text: chunk,
            hit: lowerParts.includes(chunk.toLowerCase()),
        }))
}
