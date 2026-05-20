import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function recover() {
  const { data: files, error } = await supabase.storage
    .from('user-data')
    .list('admin')
  
  if (error) {
    console.error('Error listing files:', error)
    return
  }

  let allAnnouncements: any[] = []
  
  for (const file of files) {
    if (file.name.endsWith('.json')) {
      const { data, error: downloadError } = await supabase.storage
        .from('user-data')
        .download(`admin/${file.name}`)
      
      if (!downloadError) {
        const text = await data.text()
        try {
          const json = JSON.parse(text)
          if (json.announcements) {
            console.log(`Found ${json.announcements.length} in ${file.name}`)
            allAnnouncements = [...allAnnouncements, ...json.announcements]
          }
        } catch (e) {
          console.error(`Error parsing ${file.name}`)
        }
      }
    }
  }

  console.log('Total unique announcements found:', allAnnouncements.length)
  console.log('Titles:', allAnnouncements.map(a => a.title))
  
  // If we found more than what the user sees, we can re-save them to announcements.json
  // But for now, let's just see.
}

recover()
