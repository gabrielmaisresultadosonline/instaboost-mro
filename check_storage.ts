import { createClient } from '@supabase/supabase-js'

// We'll use the environment variables provided by the sandbox
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  const { data: files, error } = await supabase.storage
    .from('user-data')
    .list('admin')
  
  if (error) {
    console.error('Error listing files:', error)
    return
  }

  console.log('Files in admin/:', files.map(f => f.name))

  for (const file of files) {
    if (file.name.endsWith('.json')) {
      const { data, error: downloadError } = await supabase.storage
        .from('user-data')
        .download(`admin/${file.name}`)
      
      if (downloadError) {
        console.error(`Error downloading ${file.name}:`, downloadError)
      } else {
        const text = await data.text()
        const json = JSON.parse(text)
        console.log(`Content of ${file.name}:`, json.announcements?.length || 0, 'announcements')
        if (json.announcements && json.announcements.length > 0) {
           console.log('Titles:', json.announcements.map((a: any) => a.title))
        }
      }
    }
  }
}

check()
