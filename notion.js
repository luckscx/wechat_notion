const process = require('node:process');
const { Client, LogLevel } = require('@notionhq/client');
const retry = require('async-await-retry');
const moment = require('moment');

const { NOTION_KEY } = process.env;
const todo_parent_id = process.env.TODO_PARENT_ID;
const task_db_id = process.env.TASK_DB_ID;
const buy_db_id = process.env.BUY_DB_ID;
const idea_db_id = process.env.IDEA_DB_ID;
const people_db_id = process.env.PEOPLE_DB_ID;
const poker_db_id = process.env.POKER_DB_ID;

const notion = new Client({ auth: NOTION_KEY, logLevel: LogLevel.WARN });

async function myRetry(foo) {
  await retry(foo, null, {
    retriesMax: 3, interval: 800, exponential: true, factor: 3, jitter: 100,
  });
}

async function appendTodo(text) {
  const new_todo_block = {
    block_id: todo_parent_id,
    children: [
      {
        to_do: {
          rich_text: [
            {
              text: {
                content: text,
              },
            },
          ],
        },
      },
    ],
  };
  try {
    await myRetry(async () => await notion.blocks.children.append(new_todo_block));
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

function makeNewTaskPage(target_title) {
  const target_day = moment.utc().format('YYYY-MM-DD');
  const new_props = {
    Name: {
      type: 'title',
      title: [{ type: 'text', text: { content: target_title } }],
    },
    事件日期: {
      type: 'date',
      date: {
        start: target_day,
      },
    },
    状态: {
      type: 'select',
      select: {
        name: '未开始',
      },
    },
    重要程度: {
      type: 'select',
      select: {
        name: '中',
      },
    },
  };
  return new_props;
}

function makeNewBuyItemPage(target_title) {
  return {
    Name: {
      type: 'title',
      title: [{ type: 'text', text: { content: target_title } }],
    },
    状态: {
      type: 'select',
      select: {
        name: '待采购',
      },
    },
    需求度: {
      type: 'select',
      select: {
        name: '中',
      },
    },
  };
}

const add_page_func_factory = async function (name, input_text, db_id, prop) {
  const new_page = {
    parent: { database_id: db_id },
    properties: prop,
  };
  console.log(new_page);
  try {
    await myRetry(async () => notion.pages.create(new_page));
    return `添加${name} [${input_text}] 成功`;
  } catch (error) {
    console.log(error);
    return `添加${name} [${input_text}] 失败，请检查日志`;
  }
};

const addTodo = async (from_text) => {
  const input_text = from_text.replace('todo', '');
  console.log(`Add todo [${input_text}]`);
  const res = await appendTodo(input_text);
  if (res) {
    return `添加ToDo项 [${input_text}] 成功`;
  }

  return '添加ToDo失败，需检查日志';
};

const check_func_factory = (pre_key_ar) => (cmd) => {
  for (let i = 0; i < pre_key_ar.length; i += 1) {
    const pre_key = pre_key_ar[i];
    if (cmd.startsWith(pre_key)) {
      console.log('hit rule');
      const regex = new RegExp(`^${pre_key}`, 'i');
      return cmd.replace(regex, '');
    }
  }
  return null;
};

const get_template_page = async (db_id) => {
  const response = await notion.databases.query({
    database_id: db_id,
    sorts: [
      {
        property: '日期',
        direction: 'descending',
      },
    ],
    page_size: 1,
  });
  const last_page = response.results[0];
  return last_page.properties;
};

const check_arr = [{
  name: '任务项',
  pre_key_ar: ['task', '任务'],
  db_id: task_db_id,
  property_maker: makeNewTaskPage,
}, {
  name: '购物项',
  pre_key_ar: ['buy', '购物'],
  db_id: buy_db_id,
  property_maker: makeNewBuyItemPage,
}, {
  name: '奇思妙想',
  pre_key_ar: ['idea', '我想'],
  db_id: idea_db_id,
}, {
  name: '关系人',
  pre_key_ar: ['people', '关系人'],
  db_id: people_db_id,
}, {
  name: 'Session记录',
  pre_key_ar: ['poker', 'pk'],
  db_id: poker_db_id,
  template_page: true, // 是否拉取上一页作为模板
  property_maker: (in_text, base_props) => {
    delete base_props['实际盈利'];
    delete base_props['每小时盈利'];
    base_props['日期'].date.start = moment.utc().format('YYYY-MM-DD HH:mm');
    base_props['结果'].number = parseInt(in_text);
    return base_props;
  },
}];

// 回包文本
async function parseText(from_text) {
  for (let i = 0; i < check_arr.length; i++) {
    const check_obj = check_arr[i];
    const check_func = check_func_factory(check_obj.pre_key_ar);
    const input_text = check_func(from_text);
    if (input_text) {
      let base_props = {
        Name: {
          type: 'title',
          title: [{ type: 'text', text: { content: input_text } }],
        },
      };
      if (check_obj.template_page) {
        base_props = await get_template_page(check_obj.db_id);
      }
      if (check_obj.property_maker) {
        base_props = check_obj.property_maker(input_text, base_props);
      }
      return add_page_func_factory(check_obj.name, input_text, check_obj.db_id, base_props);
    }
  }
  return addTodo(from_text);
}

module.exports = { parseText };
