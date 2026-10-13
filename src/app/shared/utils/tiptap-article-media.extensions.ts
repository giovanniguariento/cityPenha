import { Node, mergeAttributes } from '@tiptap/core';

/** Block `<video controls src>` for article body. */
export const ArticleVideo = Node.create({
  name: 'articleVideo',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      poster: { default: null },
      preload: { default: null },
      width: { default: null },
      height: { default: null },
      class: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'video[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: HTMLAttributes['controls'] === false ? undefined : true,
      }),
    ];
  },
});

/** Block iframe for YouTube/Vimeo embeds in article body. */
export const ArticleIframe = Node.create({
  name: 'articleIframe',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      width: { default: '560' },
      height: { default: '315' },
      title: { default: 'Vídeo embutido' },
      allow: {
        default:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      },
      allowfullscreen: { default: true },
      referrerpolicy: { default: 'strict-origin-when-cross-origin' },
      loading: { default: 'lazy' },
      frameborder: { default: '0' },
      class: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'iframe[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(HTMLAttributes)];
  },
});
