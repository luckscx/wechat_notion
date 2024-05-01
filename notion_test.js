
const notion = require("./notion.js")

async function test(){
    res = await notion.parseText("关系人xxx")
    console.log(res)
}

test()