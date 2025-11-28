import { createClient } from '@supabase/supabase-js';

import { config } from '../config/env';

export const supabaseClient = createClient(config.supabaseUrl, config.supabaseKey);
