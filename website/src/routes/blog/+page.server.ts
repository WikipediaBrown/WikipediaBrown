import { posts } from '$lib/server/posts';
export const load = () => ({ posts: posts.map(({ html, ...post }) => post) });
