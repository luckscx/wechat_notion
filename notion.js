const {Client, LogLevel} = require('@notionhq/client');
const process = require('process');

const NOTION_KEY = process.env.NOTION_KEY;
const todo_parent_id = process.env.TODO_PARENT_ID;

const notion = new Client({auth: NOTION_KEY, logLevel: LogLevel.WARN});

async function appendTodo(text) {
  const new_todo_block = {
    block_id: todo_parent_id,
    children: [
      {
        'to_do': {
          'rich_text': [
            {
              'text': {
                'content': text,
              },
            },
          ],
        },
      },
    ],
  };
  try {
    const response = await notion.blocks.children.append(new_todo_block);
    console.log(response);
    return true
  } catch (error) {
    console.log(error);
    return false
  }
}

const addTodo = async (from_text) => {
    input_text = from_text.replace("todo","")
    const res = await appendTodo(input_text);
    if (res) {
      return `添加ToDo ${input_text} 成功`
    } else {
      return '添加ToDo失败，需检查日志'
    }
};


// 回包文本
async function parseText(from_text) {
  if (from_text && from_text.startsWith("todo")) {
    return await addTodo(from_text)
  }

  return await addTodo(from_text)
}

module.exports = { parseText };
