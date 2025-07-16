import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getPosts(
  supabase: SupabaseClient<Database>,
  orgId: string,
  teamId: string
) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('org_id', orgId)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

async function getPost(supabase: SupabaseClient<Database>, postId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function createPost(
  supabase: SupabaseClient<Database>,
  input: {
    title: string
    content: string
    slug: string
    post_type: string
    org_id: string
    team_id: string
  }) {
  const { error } = await supabase.from('posts').insert({
    title: input.title,
    content: input.content,
    post_type: input.post_type,
    slug: input.slug,
    org_id: input.org_id,
    team_id: input.team_id,
    post_status: 'draft',
  })
  if (error) throw new Error(error.message)
}

async function updatePostContent(
  supabase: SupabaseClient<Database>,
  postId: string,
  content: string
) {
  const { error } = await supabase
    .from('posts')
    .update({ content })
    .eq('id', postId)
  if (error) throw new Error(error.message)
}

export const posts = {
  getAll: getPosts,
  getById: getPost,
  create: createPost,
  updateContent: updatePostContent,
} as const
