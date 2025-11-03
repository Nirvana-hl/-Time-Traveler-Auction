// 收藏集计算工具

export function loadCollectionsFromArtifacts(artifactMap) {
  const tagTotal = {}
  const arts = artifactMap || {}
  Object.keys(arts).forEach(id => {
    const tags = Array.isArray(arts[id].collectionTags) ? arts[id].collectionTags : []
    tags.forEach(tag => { tagTotal[tag] = (tagTotal[tag] || 0) + 1 })
  })
  return Object.keys(tagTotal).map(tag => ({ id: tag, name: tag, description: '', requiredCount: tagTotal[tag] }))
}

export function getCurrentCollectionCount({ artifactMap, ownedArtifactIds, collection }) {
  if (!Array.isArray(ownedArtifactIds)) return 0
  const requiredCap = Number(collection.requiredCount) || Infinity
  let count = 0
  ownedArtifactIds.forEach(artifactId => {
    const artifact = artifactMap[artifactId]
    if (artifact && Array.isArray(artifact.collectionTags) && artifact.collectionTags.includes(collection.name)) count++
  })
  return Math.min(count, requiredCap)
}

export function getCollectionProgress({ current, required }) {
  const req = Number(required) || 1
  return Math.min((current / req) * 100, 100)
}


