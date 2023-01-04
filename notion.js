const {Client, LogLevel} = require('@notionhq/client');
const process = require('process');
const retry = require('async-await-retry');
const moment = require('moment');

const NOTION_KEY = process.env.NOTION_KEY;
const todo_parent_id = process.env.TODO_PARENT_ID;
const task_db_id = process.env.TASK_DB_ID;
const buy_db_id = process.env.BUY_DB_ID;

const notion = new Client({auth: NOTION_KEY, logLevel: LogLevel.WARN});

async function myRetry(foo){
    await retry(foo, null, {retriesMax: 3, interval: 800, exponential: true, factor: 3, jitter: 100});
}

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
    await myRetry(async () => {
      return await notion.blocks.children.append(new_todo_block);
    })
    return true
  } catch (error) {
    console.log(error);
    return false
  }
}

function makeNewTaskPage(target_title) {
  const target_day = moment().format('YYYY-MM-DD');
  const new_props = {
    'Name': {
      type: 'title',
      title: [{type: 'text', text: {content: target_title}}],
    },
    '事件日期': {
      type: 'date',
      date: {
        start: target_day,
      },
    },
    '状态': {
      type: 'select',
      select: {
        'name': "未开始",
      },
    },
    '重要程度': {
      type: 'select',
      select: {
        'name': "中",
      },
    },
  };
  return new_props;
}

function makeNewBuyItemPage(target_title) {
  const new_props = {
    'Name': {
      type: 'title',
      title: [{type: 'text', text: {content: target_title}}],
    },
    '状态': {
      type: 'select',
      select: {
        'name': "待采购",
      },
    },
    '需求度': {
      type: 'select',
      select: {
        'name': "中",
      },
    },
  };
  return new_props;
}

async function appendTask(from_text) {
  input_text = from_text.replace("task","")
  const new_task_page = {
    parent: {database_id : task_db_id},
    properties: makeNewTaskPage(input_text),
  };
  try {
    await myRetry(async () => {
      return await notion.pages.create(new_task_page);
    })
    return `添加任务项 [${input_text}] 成功`
  } catch (error) {
    console.log(error);
    return `添加任务项 [${input_text}] 失败，请检查日志`
  }
}

async function appendBuyItem(from_text) {
  input_text = from_text.replace("buy","")
  const new_buy_page = {
    parent: {database_id : buy_db_id},
    properties: makeNewBuyItemPage(input_text),
  };
  try {
    await myRetry(async () => {
      return await notion.pages.create(new_buy_page);
    })
    return `添加购物项 [${input_text}] 成功`
  } catch (error) {
    console.log(error);
    return `添加购物项 [${input_text}] 失败，请检查日志`
  }
}

const addTodo = async (from_text) => {
    input_text = from_text.replace("todo","")
    console.log(`Add todo [${input_text}]`);
    const res = await appendTodo(input_text);
    if (res) {
      return `添加ToDo项 [${input_text}] 成功`
    } else {
      return '添加ToDo失败，需检查日志'
    }
};


// 回包文本
async function parseText(from_text) {
  if (from_text && from_text.startsWith("todo")) {
    return await addTodo(from_text)
  }

  if (from_text && from_text.startsWith("task")) {
    return await appendTask(from_text)
  }
  if (from_text && from_text.startsWith("buy")) {
    return await appendBuyItem(from_text)
  }

  return await addTodo(from_text)
}

module.exports = { parseText };
