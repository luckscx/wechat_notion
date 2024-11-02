
const notion = require("./notion.js")

async function test(){
    res = await notion.parseText("poker -100")
    console.log(res)
}

test()