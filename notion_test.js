
const notion = require("./notion.js")

async function test(){
    res = await notion.parseText("idea打扑克")
    console.log(res)
}

test()