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
  const target_day = moment().format('YYYY-MM-DD');
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
  const new_props = {
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
  return new_props;
}

const add_page_func_factory = function (name, db_id, property_maker) {
  return async function (input_text) {
    let prop = {
      Name: {
        type: 'title',
        title: [{type: 'text', text: {content: input_text}}],
      },
    }
    if (property_maker) {
      prop = property_maker(input_text)
    }
    const new_page = {
      parent: {database_id: db_id},
      properties: prop
    };
    console.log(new_page)
    try {
      await myRetry(async () => notion.pages.create(new_page));
      return `添加${name} [${input_text}] 成功`;
    } catch (error) {
      console.log(error);
      return `添加${name} [${input_text}] 失败，请检查日志`;
    }
  }
}

const appendPeopleItem = add_page_func_factory("关系人", people_db_id)
const appendIdeaItem = add_page_func_factory("奇思妙想", idea_db_id)
const appendTask = add_page_func_factory("任务项", task_db_id, makeNewTaskPage)
const appendBuyItem = add_page_func_factory("购物项", buy_db_id, makeNewBuyItemPage)

const addTodo = async (from_text) => {
  const input_text = from_text.replace('todo', '');
  console.log(`Add todo [${input_text}]`);
  const res = await appendTodo(input_text);
  if (res) {
    return `添加ToDo项 [${input_text}] 成功`;
  }

  return '添加ToDo失败，需检查日志';
};

const check_func_factory = (pre_key_ar) => {
  return (cmd) => {
    for (let i = 0; i < pre_key_ar.length; i += 1) {
      const pre_key = pre_key_ar[i];
      if (cmd.startsWith(pre_key)) {
        console.log("hit rule")
        const regex = new RegExp(`^${pre_key}`, 'i');
        return cmd.replace(regex, '');
      }
    }
    return null;
  };
};

const is_task_cmd = check_func_factory(["task","任务"])
const is_buy_cmd = check_func_factory(["buy","购物"])
const is_idea_cmd = check_func_factory(["idea","我想"])
const is_people_cmd = check_func_factory(["people","关系人"])

const check_arr = [{
  check : is_task_cmd,
  add : appendTask
}, {
  check : is_buy_cmd,
  add : appendBuyItem,
}, {
  check : is_idea_cmd,
  add : appendIdeaItem,
}, {
  check : is_people_cmd,
  add : appendPeopleItem,
}]

// 回包文本
async function parseText(from_text) {
  for (let i = 0; i < check_arr.length; i++) {
    const check_obj = check_arr[i]
    const res = check_obj.check(from_text)
    if (res) {
      return check_obj.add(res)
    }
  }
  return addTodo(from_text);
}

module.exports = { parseText };
