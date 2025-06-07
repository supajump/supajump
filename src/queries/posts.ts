import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export async function fetchPosts(orgId: string, teamId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('org_id', orgId)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function fetchPost(postId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createPost(input: {
  title: string
  content: string
  slug: string
  post_type: string
  org_id: string
  team_id: string
}) {
  const supabase = createBrowserClient()
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

export async function updatePostContent(postId: string, content: string) {
  const supabase = createBrowserClient()
  const { error } = await supabase
    .from('posts')
    .update({ content })
    .eq('id', postId)
  if (error) throw new Error(error.message)
}
