// server.js
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const port = process.env.SERVER_PORT || 3000;
const host = process.env.SERVER_HOST || 'localhost';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/js/htmx.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/htmx.org/dist/htmx.min.js'));
});

async function fetchTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

app.get('/', async (req, res) => {
  try {
    const todos = await fetchTodos();
    res.render('index', { todos, error: null });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.render('index', { todos: [], error: 'Failed to load todos' });
  }
});

app.post('/todos', async (req, res) => {
  console.log('POST /todos body:', req.body);
  try {
    const { task } = req.body;

    if (!task || task.trim().length === 0) {
      return res.status(400).render('partials/error', { message: 'Task is required' });
    }

    const { error: insertError } = await supabase
      .from('todos')
      .insert([{ task: task.trim() }]);
    if (insertError) throw insertError;

    const todos = await fetchTodos();
    res.render('partials/todo-list', { todos });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).render('partials/error', { message: 'Failed to create todo' });
  }
});

app.put('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { task, completed } = req.body;

    const updates = {
      task: task?.trim(),
      completed: completed === 'on',
    };
    Object.keys(updates).forEach(
      (key) => updates[key] === undefined && delete updates[key]
    );

    const { error: updateError } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id);
    if (updateError) throw updateError;

    const { data: todo, error: fetchError } = await supabase
      .from('todos')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    res.render('partials/todo-item', { todo });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).render('partials/error', { message: 'Failed to update todo' });
  }
});

app.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error: deleteError } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);
    if (deleteError) throw deleteError;

    const todos = await fetchTodos();
    res.render('partials/todo-list', { todos });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).render('partials/error', { message: 'Failed to delete todo' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://${host}:${port}`);
});