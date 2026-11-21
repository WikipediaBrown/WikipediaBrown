import { posts } from '$lib/server/posts';
import { error } from '@sveltejs/kit';
export const entries = () => posts.map((post) => ({ slug: post.slug }));
export const load = ({ params }: { params: { slug: string } }) => {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) error(404, 'Post not found');
  return { post };
};
