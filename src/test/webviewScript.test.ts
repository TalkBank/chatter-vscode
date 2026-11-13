/** Real JavaScript parsing establishes the inline-script byte contract. */
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { injectPanelScript } from '../webviewScript';

describe('panel script admission', () => {
    /**
     * Guards: dollar replacement tokens and HTML script delimiters survive as the exact original graph-label data.
     * Kind: wire
     * Not a type: closed panel variants enforce required globals, while the HTML and JavaScript parsers still interpret external string bytes.
     * State: a fresh real JavaScript VM per payload parses the produced script, without an editor, filesystem or network.
     * Concurrency: none, each context owns its bindings and is evaluated synchronously.
     */
    it('round-trips graph labels through literal template insertion', () => {
        for (const label of ['$&', '$`', "$'", '</script><!--', 'Unicode Ω 🧪']) {
            const dotSource = `digraph { node [label=${JSON.stringify(label)}] }`;
            const html = injectPanelScript('<main></main><!--INJECT_DATA--><footer></footer>', {
                kind: 'graph', dotSource, graphvizUri: 'https://example.test/graphviz.js',
            });
            const start = html.indexOf('<script>') + '<script>'.length;
            const end = html.indexOf('</script>');
            const context = createContext({});
            runInContext(html.slice(start, end), context);
            expect(runInContext('dotSource', context)).toBe(dotSource);
            expect(html.slice(end + '</script>'.length)).toBe('<footer></footer>');
        }
    });
});
