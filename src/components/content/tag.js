import { useEffect, useCallback, useState, useRef } from "react";
import { Tag, Space, Popover, Flex, Typography, 
    Tooltip, Button, Divider, List, Avatar, Input, Row, Col, Spin } from "antd";
import { cx, css } from "@emotion/css";
import {
    RedoOutlined,
    PushpinOutlined,
    MessageOutlined,
    UserOutlined,
    OpenAIOutlined,
    QuestionCircleOutlined
  } from '@ant-design/icons';
//import useDynamicRefs from "use-dynamic-refs";
import axios from "axios";

export function FallacyTag({fallacyChatList, setFallacyChatList,
    clickSentence, setClickSentence, fallacyNodes, newscase}){
    //const [tagdom, setTagdom] = useState([]);
    const [chatList, setChatList] = useState([]);
    const [textAreaValue, setTextAreaValue] = useState("");
    const [open, setOpen] = useState([]);

    const { Text, Link } = Typography;
    const { TextArea } = Input;

    const handleLevelChange = (value, lv) => {
        //console.log(value, lv);
         setFallacyChatList({
             ...fallacyChatList,
             [value]: {
                 ...fallacyChatList[value],
                 level: lv
             }
         })
     };

    const llmchat = (msg, ftype, userinput) => {
        //console.log("LLM", msg);
        axios.post('https://demo.vaderlab.org/misinfo-server/llmchat', msg)
        .then(function (response) {
            //console.log(response);
            const sysMsg = response.data.msg;
            const newChat = JSON.parse(JSON.stringify(fallacyChatList));
            const newClist = newChat[ftype].chatList;
            //console.log("newClist", newClist, "sysMsg", sysMsg);
            newClist.push({
                role: "user",
                content: userinput
            });
            newClist.push({
                role: "assistant",
                content: sysMsg
            });
            setFallacyChatList({
                ...fallacyChatList,
                [ftype]: {
                    ...fallacyChatList[ftype],
                    chatList: newClist
                }
            });
        })
        .catch(function (error) {
          console.log(error);
        });
    };

     const chatWithLLM = (userinput, ftype) => {
        //console.log(newscase);
        let content = '';
        newscase.content.forEach(e=>{
            content = content + e.text + '\n';
        });
        const msg = {
            fallacy: fallacyChatList[ftype].name,
            title: newscase.title,
            article: content,
            user_content: textAreaValue
        };
        // chat with llm
        llmchat(msg, ftype, textAreaValue);
     };

     const handleLevel3Change = (ftype) => {
        //console.log(textAreaValue, ftype);
        //const userinput = textAreaValue;
        const newChat = JSON.parse(JSON.stringify(fallacyChatList));
        const newClist = newChat[ftype].chatList;
        newClist.push({
            role: "user",
            content: textAreaValue
        });
        newClist.push({
            role: "assistant",
            content: 'loading'
        });
        //console.log(newClist)
        setFallacyChatList({
            ...fallacyChatList,
            [ftype]: {
                ...fallacyChatList[ftype],
                chatList: newClist
            }
        });
        setTextAreaValue("");
        // connect to the server
        chatWithLLM(textAreaValue, ftype);
    };

    const handleTextAreaValueChange=(v)=>{
        setTextAreaValue(v.target.value);
    };

    const handleOpenChange = (ftype, index) => {
        const nextopen = open.map((o,i)=>{
            if(i === index){
                return !o;
            }else{
                return o;
            }
        });
        //console.log(ftype, open, nextopen);
        setOpen(nextopen);
        setClickSentence({
            p_index: null,
            fallacy: null
        });
        setFallacyChatList({
            ...fallacyChatList,
            [ftype]: {
                ...fallacyChatList[ftype],
                open: nextopen[index]
            }
        });
    };

    const sentenceClicked = useCallback(()=>{
        fallacyNodes.forEach((tag, index)=>{
            if(clickSentence.fallacy===tag.fallacy){
                const nextopen = open.map((o,i)=>{
                    if(i === index){
                        return !o;
                    }else{
                        return o;
                    }
                });
                //console.log("sentence", clickSentence.fallacy, nextopen);
                setOpen(nextopen);
                setFallacyChatList({
                    ...fallacyChatList,
                    [tag.fallacy]: {
                        ...fallacyChatList[tag.fallacy],
                        open: nextopen[index]
                    }
                });
            }
        });
    },[clickSentence]);

    const generateTags = useCallback(()=>{
        let openList = [];
        fallacyNodes.forEach(e=>{openList.push(false)});
        open.length === 0 && setOpen(openList);
        //console.log(paragraphID, openList);
    },[fallacyNodes]);

    const genChatList = useCallback(()=>{
        const chatlist_ = JSON.parse(JSON.stringify(fallacyChatList));
        //console.log('genChatList', chatlist_);
        Object.keys(chatlist_).forEach(key=>{
            if(chatlist_[key].level === "L1"){
                chatlist_[key].chatList = [fallacyChatList[key].chatList[0]];
            }else if(chatlist_[key].level === "L2"){
                chatlist_[key].chatList = [
                    fallacyChatList[key].chatList[0],
                    fallacyChatList[key].chatList[1]
                ];
            }
        });
        setChatList(chatlist_);
    },[fallacyChatList]);

    useEffect(()=>{
        generateTags();
    },[fallacyNodes]);

    useEffect(()=>{
        genChatList();
    },[fallacyChatList]);

    useEffect(()=>{
        sentenceClicked();
    },[clickSentence]);
    
    return(
            <>
            {fallacyNodes.map((e,i)=>{
                const fallacyData = fallacyChatList[e.fallacy];
                // Skip if fallacy not in config
                if (!fallacyData) {
                    console.warn(`Fallacy "${e.fallacy}" not found in config`);
                    return null;
                }
                const fallacyName = fallacyData.name;
                const fallacyColor = fallacyData.color;
                const fallacyIntroduction = fallacyData.explanation;
                const ifopen = fallacyData.open;
                //console.log("ifopen", ifopen);
                const ftype = e.type[0]; // Now there is no duplicates between chart and text fallacies
                const fallacyExplanationPopContent = (
                    <div style={{
                        width: 150
                    }}><Space direction="vertical" size="small">
                        <Text>{fallacyIntroduction}</Text>
                        {fallacyData.wiki !== "" &&
                        <Link href={fallacyData.wiki} target="_blank">
                            Read more...
                        </Link>}
                        <Link href={"https://duckduckgo.com/?q="+fallacyName} target="_blank">
                            Search more information
                        </Link>
                    </Space>
                    </div>
                );
                const popContent = (
                    <div style={{
                        width: 320,
                    }}>
                        <Row>
                            <Col span={18}>
                                <Popover content={fallacyExplanationPopContent}>
                                    <Text strong style={{
                                        color: fallacyColor,
                                        marginTop: 1,
                                    }}>{fallacyName} </Text>
                                    <QuestionCircleOutlined />
                                </Popover>
                            </Col>
                            <Col span={6}>
                                <Space.Compact style={{marginLeft: 100, float: "right"}}>
                                    <Tooltip title="Requery LLM for the explanation">
                                        <Button style={{padding: 2, height: "27px"}} icon={<RedoOutlined style={{ fontSize: '12px' }} />} />
                                    </Tooltip>
                                    <Tooltip title="Chat with LLM for further information">
                                        <Button
                                            style={{padding: 2, height: "27px"}} 
                                            icon={<MessageOutlined style={{ fontSize: '12px' }} />}
                                            onClick={()=>handleLevelChange(e.fallacy,'L3')}
                                        />
                                    </Tooltip>
                                    <Tooltip title="Pin the window">
                                        <Button  style={{padding: 2, height: "27px"}} icon={<PushpinOutlined style={{ fontSize: '12px' }} />} />
                                    </Tooltip>
                                </Space.Compact>
                            </Col>
                        </Row>
                        
                        <div
                        id="scrollableDiv"
                        style={{
                            maxHeight: 700,
                            marginTop: 10,
                            overflow: 'auto',
                        }}
                        >
                            {fallacyData.fsource === "chart" &&
                            <>
                            <Text><b>Chart-text Linkage: </b>{fallacyData.reason}</Text>
                            <Divider style={{marginTop: 5, marginBottom: 2}} />
                            </>
                            
                            }
                            <List
                                size="small"
                                dataSource={chatList[e.fallacy].chatList}
                                renderItem={(item, index)=>{
                                    //console.log(item.link);
                                    return <List.Item>
                                        <List.Item.Meta
                                            /*avatar={
                                                <Avatar 
                                                    size="small" 
                                                    icon={item.role === "user"? <UserOutlined /> : <OpenAIOutlined />} 
                                                />
                                            }
                                            title={item.role}*/
                                        />
                                        {(item.role === "assistant" && item.content === "loading") && <Spin />}
                                        {item.content+" "}
                                        {(item.link !== "" && item.link !== undefined) && 
                                        <Link href={item.link} target="_blank">
                                         See external recommended links
                                        </Link>
                                        }
                                    </List.Item>
                                }}
                            />
                            {
                                fallacyData.level==="L1" &&
                                <Divider plain style={{marginTop: 2}}>
                                    <Space size="small">
                                        Show
                                    <Button
                                        type="dashed"
                                        size="small"
                                        onClick={()=>handleLevelChange(e.fallacy,'L2')}>
                                        more &#8744;
                                    </Button>
                                    explanation
                                    </Space>
                                </Divider>
                            }
                            {
                                fallacyData.level==="L2" &&
                                <Divider plain style={{marginTop: 2}}>
                                    <Space size="small">
                                    Show
                                    <Button
                                        type="dashed"
                                        size="small"
                                        onClick={()=>handleLevelChange(e.fallacy,'L3')}>
                                        more &#8744;
                                    </Button>
                                    <Button
                                        type="dashed"
                                        size="small"
                                        onClick={()=>handleLevelChange(e.fallacy,'L1')}>
                                        less &#8743;
                                    </Button>
                                    explanation
                                    </Space>
                                </Divider>
                            }
                            {
                                fallacyData.level==="L3" && 
                                <>
                                <Divider plain style={{marginTop: 2}}>
                                    
                                    <Button 
                                        type="dashed" 
                                        size="small" 
                                        onClick={()=>handleLevelChange(e.fallacy,'L2')}>
                                        less &#8743;
                                    </Button>
                                    
                                </Divider>
                                 <Space
                                    direction="vertical"
                                    style={{
                                        width: "100%",
                                    }}
                                    >
                                    <TextArea 
                                        size="small" 
                                        allowClear 
                                        showCount 
                                        rows={3} 
                                        maxLength={1000} 
                                        placeholder="Press 'Enter' to send your prompts"
                                        value={textAreaValue}
                                        onChange={(v)=>handleTextAreaValueChange(v)}
                                        //onPressEnter={(value)=>handleLevel3Change(value, e)}
                                    />
                                    <Button 
                                    size="small" 
                                    type="primary"
                                    onClick={()=>handleLevel3Change(e.fallacy)}
                                    >Submit</Button>
                                    </Space>
                                </> 
                            }
                        </div>
                    </div>
                );
                return (
                    <div key={"fdiv-"+e.id}>
                    <Popover 
                        key={"fallacyTagPop-"+e.id} 
                        content={popContent} 
                        placement="right" 
                        trigger="click"
                        open={open[i]}
                        onOpenChange={()=>handleOpenChange(e.fallacy, i)}
                    >
                    <Tooltip key={"fdiv-tooltip-"+e.id} title={
                        fallacyName === "Improper Criteria" && "This passage may attempt to deal with an issue by invoking aspects that aren't relevant or ignoring ones that are. Click for an explanation."
                        }>
                    <Tag 
                    key={"ftag-"+e.id}
                    color={fallacyColor} 
                    className={cx('underline_minimap', css`
                        cursor: pointer;
                        top: ${e.top}px;
                        opacity: ${ifopen ? 1 : 0.4};
                        /*max-width: 110px;*/
                    `)}
                    //onClick={ee=>console.log(ee.target.outerText)}
                    >   
                        <b 
                            style={{
                                //wordWrap: "break-word", 
                                //whiteSpace: "pre-wrap"
                            }}
                        >
                            {fallacyName}
                        </b>
                    </Tag>
                    </Tooltip>
                    </Popover>
                    </div>
                );
            })}
        </>
    );
}