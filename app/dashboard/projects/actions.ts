'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type ActionState = { error: string } | null;

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = getFormString(formData, 'name');
  const description = getFormString(formData, 'description');

  if (!name) return { error: 'Project name is required.' };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated.' };

  const { error } = await supabase.from('projects').insert({
    user_id: user.id,
    name,
    description: description || null,
  });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/projects');
  redirect('/dashboard/projects');
}

export async function updateProjectAction(
  projectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = getFormString(formData, 'name');
  const description = getFormString(formData, 'description');

  if (!name) return { error: 'Project name is required.' };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('projects')
    .update({ name, description: description || null })
    .eq('id', projectId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/projects');
  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}`);
}

export async function deleteProjectAction(projectId: string, formData: FormData) {
  void formData;
  const supabase = createSupabaseServerClient();
  await supabase.from('projects').delete().eq('id', projectId);

  revalidatePath('/dashboard/projects');
  redirect('/dashboard/projects');
}
