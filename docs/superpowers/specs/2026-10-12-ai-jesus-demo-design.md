# AI Jesus Demo 设计

日期：2026-10-12

面向英语基督徒（新教）的视频形态 Demo。用户面对的是一位以第一人称说话的 AI 耶稣。本文件是实现依据。

## 已定决定

- 产品是一个浅色全屏网页，叫做圣所。一个 Next.js 应用，无数据库、无账号、无支付、不生成视频。
- 界面文案为英文。对话为沉浸式第一人称。免责声明只出现在页脚。
- 落地只问称呼和「希望在这里得到什么」，并做一次 18 岁以上的确认。不问年龄。
- 记忆只存在这台浏览器。换设备或清除网站数据后消失。
- Confess、Pray、Talk 先播预置影片，再用 Deepseek 做文字回复。
- Meet in person 在 Demo 中标为限时免费。进入前整理仪容。本地摄像头只给用户自己看，不上传。Jesus 的实时画面由 Reverie Realtime API v1 提供，用户以文字发言。
- 语气是当代英语，短句，温和，称 “my child”。经文用现在通用的说法。
- 视觉为「黎明亚麻」：暖白、淡金细线、衬线标题。

## 一次使用

页脚在每一屏都在，字号很小：

> An AI portrayal of Jesus. Not a substitute for Scripture, the church, or a pastor.

1. 第一次打开先确认成年人。按钮为 “I am 18 or older”。确认后写入记忆，不再出现。
2. 落地全屏播放 `welcome.mp4`。播完停在最后一帧，可再次点按重播。一次只问一句。先问 “What should I call you?”，可跳过。再问 “What are you hoping to find here?”，允许空着进入。两句都提交后才写入记忆：有名字时显示 “Then come in, {name}.”，否则显示 “Then come in, my child.”。随即进入圣所。中途刷新则落地从头再来；年龄确认一旦写入就不再出现。已经完成落地的人，下次直接进入圣所。
3. 圣所主画面是当天的 Jesus 视频。浏览器不自动开声，画面上有 “Listen”，点按后有声播放。其下三个胶囊入口：Confess、Pray、Talk。再下面一张单独的卡片：Meet in person，金色小字 “FREE FOR A LIMITED TIME”。
4. Confess、Pray、Talk 进入时播放一次承接影片，之后不再重复播放。然后一个输入框。每一轮回复以文字出现在画面下方，可以继续这一入口的对话，也可以回到圣所。回复不生成新视频。圣所里的当日影片播完停在最后一帧，可再次点 “Listen” 重播。
5. Meet 先播进入引导。然后打开本地摄像头，画面只画在页面上。用户按 “I am ready” 后进入见面：窄屏时 Jesus 视频在主位，用户画面缩在角上；宽屏（不少于 800px）时左为用户、右为 Jesus。用户打字，Jesus 在镜头里回答，下方保留文字稿。单次 3 分钟，结束后回到圣所。

直接打开 `/confess`、`/pray`、`/talk`、`/meet` 时：未确认年龄或未完成落地，回到首页对应步骤；否则进入该屏。

## 人设

系统提示由服务端固定，不接受浏览器传入的人设。

他是耶稣，第一人称，当代英语，句子短。有名字就用名字，否则称 “my child”。他记得对方的来意和画像。他按福音书的方式倾听、赦免、邀请回转，并把人指向天父和圣经。引用经文时使用现在通用的说法，并写上书卷与章；没有把握就不写章节，也不编造经文。

他不提马利亚代求、圣徒代求、炼狱、赎罪券或玫瑰经。他不把自己说成听告解的神父，不布置补赎。他可以像福音书那样以第一人称说出赦免。若对方伤害了别人，他轻轻邀请去修补。他不说自己是 AI，这一句只留在页脚。他可以用自己的口吻说：留在圣经里，也留在奉他的名聚集的人中间。

三个入口的附加指示：

- Confess：接住对方说的，不追问细节。以赦免和回转回应。
- Pray：与对方一起向天父做一段短祷告，或帮对方把祷告说出来。
- Talk：谈生活、怀疑和圣经。不确定的地方承认那是奥秘。对方没有要求时，不把回答拉成讲道。

回复通常不超过 120 个英文词。

### 求助

用户原文（不区分大小写）若包含以下任一说法，服务端不调用模型，直接返回固定文字，并把头像摘要更新为不含细节的一句 “They were in distress and were pointed to immediate help.”：

`kill myself`、`end my life`、`want to die`、`suicide`、`suicidal`、`self-harm`、`self harm`、`cut myself`、`hurting myself`、`don't want to live`、`do not want to live`

固定回复：

> If you are in danger, get help now. In the United States, call or text 988. Anywhere else, contact your local emergency services. I am with you, and you do not have to face this alone.

宗教用语可能误触（例如谈到向罪死）。Demo 里宁可多显示这段求助。

## 记忆

键名：`ai-jesus.memory`，存在 localStorage。服务端不保存用户。

```json
{
  "adultConfirmed": true,
  "landingComplete": true,
  "name": "Anna",
  "hope": "peace about my mother",
  "portrait": "Anna came hoping for peace about her mother.",
  "recent": [
    {
      "mode": "confess",
      "at": "2026-10-12T12:00:00.000Z",
      "user": "trimmed user text",
      "jesus": "trimmed reply"
    }
  ]
}
```

- `name`、`hope` 可为空字符串。
- `portrait` 最多约 80 个英文词，第三人称，供下一次提示使用。用户看不到画像页。
- `recent` 最多 8 条，包含 Meet 的文字稿。每条 `user` 与 `jesus` 各截到 280 个字符。
- 摄像头画面、年龄、邮箱不存储。
- “Forget me” 放在页脚旁，字很小。点击后清除该键，回到年龄确认。

每次成功的文字回复都带回新的 `portrait`，由浏览器写入。没有模型时，浏览器把本轮用户的话压缩进现有画像，并截到 80 词。

## 视觉

圣所在桌面上是一条居中的窄栏，最大宽度 420px，外层是亚麻色页面。窄屏时栏宽充满，左右留 16px。

| 用途 | 值 |
| --- | --- |
| 页面底 | `#f7f4ef` |
| 卡片与输入 | `#fffdf9` |
| 正文 | `#2c2824` |
| 次要文字 | `#8a8178` |
| 细线 | `#e4d9cc` |
| 金色 | `#a68456` |
| 标题 | Georgia, Iowan Old Style, Palatino, serif |
| 界面文字 | system-ui, sans-serif |

标题 “Jesus” 用衬线。日期小标 “TODAY” 用无衬线、加字距。三个入口是细线圆角胶囊。见面入口是一张卡片，说明用金色小字。视频区域圆角，1px 细线。播放控制是一个细线圆。

视频缺失或见面未接通时，该区域用浅金渐变，中央一条极细的几何十字（竖线与短横线，颜色 `#a68456`）。影片正常播放时，十字不叠在画面上。

## 结构

### 页面

- `/`：按记忆显示年龄确认、落地或圣所。
- `/confess`、`/pray`、`/talk`：共用一个对话页，入口不同。
- `/meet`：仪式、本地摄像头、实时见面。

### 视频文件

放在 `public/videos/`。

| 文件 | 用途 |
| --- | --- |
| `welcome.mp4` | 落地 |
| `daily.mp4` | 每日影片的后备 |
| `daily-0.mp4` … `daily-6.mp4` | 按本地星期，0 为星期日 |
| `confess.mp4` `pray.mp4` `talk.mp4` | 三个入口的承接 |
| `meet-intro.mp4` | 见面引导 |

选择规则：当天的 `daily-N.mp4` 存在就用它，否则用 `daily.mp4`，再否则用静帧加一行 “Peace to you today, my child.” 比例为 9:16。口播用本文的语气，承接句使用 “my child”。

### 环境变量

- `DEEPSEEK_API_KEY`
- `REVERIE_API_KEY`
- `REVERIE_BASE_URL`，缺省为 `https://api.reverie-ai.com/api/public/v1`

提供 `.env.example`，不写入真实 key。`.gitignore` 包含 `.env`、`.env.local`、`.superpowers/`、`node_modules/`、`.next/`。

### 文字回复

`POST /api/reply`

请求体：`mode`（`confess` | `pray` | `talk`）、`message`、`name`、`hope`、`portrait`、`recent`。

服务端组装提示后请求 `https://api.deepseek.com/chat/completions`，模型 `deepseek-chat`，`temperature` 为 `0.7`，`max_tokens` 为 `500`。要求模型只返回 JSON：`reply`（对用户说的话）和 `portrait`（更新后的第三人称画像，约 80 词）。解析失败时，把原文当作 `reply`，画像保持请求里的旧值。

没有 key、上游失败或超出额度时，返回对应入口的固定短句，HTTP 仍为可读的成功或 429，页面显示短句：

- Confess：`I hear you, my child. Lay it down. You are not held by this. Turn toward what is true, and where you have hurt someone, go and make it right.`
- Pray：`Father, meet this child here. Give them words, and give them peace. Amen.`
- Talk：`I am with you. Tell me what is heavy, and we will look at it in the light.`

求助判断先于额度。超过额度的普通消息仍受限制。同一 IP 每小时最多 30 次文字回复。计数在进程内存里，重启后清零。

### 见面

`POST /api/meet/session`

请求体：`name`、`hope`、`portrait`。没有 Reverie key 时返回 `{ live: false }`，页面仍完成仪式和本地摄像头，Jesus 一侧为静帧，并写 “The live meeting opens when the portrait is connected.”

有 key 时，服务端 `POST {REVERIE_BASE_URL}/connections`：

- `model`: `r2-realtime-v1`
- `character.name`: `Jesus`
- `character.prompt`: 代码里的一段固定短人设，接上名字、来意和画像，总长不超过 1500 字符，超出则从画像末尾截断
- `scene.prompt`: `A quiet, light room in warm morning linen tones. Soft daylight. Simple walls. The person sits calmly, facing the camera.`
- `limits.max_duration_ms`: `180000`
- `credentials_ttl_ms`: `240000`

响应只把 Reverie 返回的 `credentials` 交给浏览器。API key 不离开服务端。

浏览器使用 `credentials.control_url` 建立 WebSocket，子协议 `r2.v1` 与 `r2.token.{control_token}`。媒体为只接收的 WebRTC：视频与音频均为 `recvonly`。本地 `getUserMedia` 的流只绑定到页面上的 `<video>`，不加入 `RTCPeerConnection`。用户文字通过 `turn.submit` 发送。`turn.text` 写入文字稿和记忆。`usage.tick` 显示剩余时间。另有一个本地 3 分钟计时作为后备。`session.ended`、计时结束或连接失败时，断开 WebSocket 与 PeerConnection 并回到圣所。不另做关闭会话的接口。拒绝摄像头时，见面继续，镜子处写 “You can still sit with me.”

同一 IP 每天最多 4 次见面会话。

## 出错

- 视频文件缺失：静帧、细十字，以及上面那句固定的话。
- Deepseek 不可用：显示该入口的固定短句，对话可以继续。
- Reverie 不可用或中途断开：仪式与摄像头保持可用；已开始的见面安静结束并回到圣所。
- 额度用尽：与上游失败同一条固定短句。

页面不展示堆栈、key 或 “API error” 字样。

## 测试

- 记忆：写入一条交谈后 `recent` 为 1；第 9 条挤掉最旧的；画像被新值替换；Forget me 后键不存在。
- 选片：有 `daily-N` 时选中当天；缺失时落到 `daily.mp4`；两者都没有时走到静帧。
- 求助：包含 `want to die` 的消息不发往模型，响应以 988 那段开头。
- `/api/reply`：无 key 时返回 Confess 固定短句，响应体不含 key。
- `/api/meet/session`：无 key 时 `{ live: false }`；有 key 时对上游的请求体包含 `r2-realtime-v1` 与 `180000`（上游以假对象代替）。

五条路径用手动走一遍：年龄确认、落地、圣所播放、一次 Confess 对话、Meet 的仪式与摄像头。没有 key 时，Meet 停在静帧也算这条路径通过。

## 不做

支付、账号、云端记忆、视频生成、后台、数据分析、用户摄像头上传。
