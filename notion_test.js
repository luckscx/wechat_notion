
const notion = require("./notion.js")

async function test(){
    res = await notion.parseText("poker 123")
    console.log(res)
}

test()