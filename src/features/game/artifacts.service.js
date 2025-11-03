// 奇物数据服务：从数据库加载 artifacts

export async function loadArtifacts({ supabase }) {
  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
  if (error) { throw error }
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    era: row.era,
    location: row.location,
    story: row.story,
    collectionTags: row.collection_tags || [],
    baseValue: row.base_value || 0,
    image: row.image
  }))
}


