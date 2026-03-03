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
        if (!clickSentence.fallacy) return;

        // Find the instance that contains the clicked sentence
        let foundMatch = false;
        fallacyNodes.forEach((tag, index)=>{
            if (foundMatch) return;  // Only open first matching instance

            const instanceKey = tag.instanceKey;
            const fallacyData = fallacyChatList[instanceKey];
            if (!fallacyData) return;

            // Check if this is a chart click with specific instanceKey
            if (clickSentence.isChart && clickSentence.instanceKey) {
                if (instanceKey === clickSentence.instanceKey) {
                    foundMatch = true;
                    const nextopen = open.map((o,i)=>{
                        if(i === index) return !o;
                        return o;
                    });
                    setOpen(nextopen);
                    setFallacyChatList({
                        ...fallacyChatList,
                        [instanceKey]: {
                            ...fallacyChatList[instanceKey],
                            open: nextopen[index]
                        }
                    });
                }
                return;
            }

            // Check if this instance's fallacy code matches AND contains the clicked sentence
            const fallacyMatches = clickSentence.fallacy === tag.fallacy;
            const sentenceMatches = clickSentence.sentenceIndex &&
                fallacyData.sentences?.includes(clickSentence.sentenceIndex);

            if (fallacyMatches && sentenceMatches) {
                foundMatch = true;
                const nextopen = open.map((o,i)=>{
                    if(i === index){
                        return !o;
                    }else{
                        return o;
                    }
                });
                setOpen(nextopen);
                setFallacyChatList({
                    ...fallacyChatList,
                    [instanceKey]: {
                        ...fallacyChatList[instanceKey],
                        open: nextopen[index]
                    }
                });
            }
        });
    },[clickSentence, fallacyNodes, fallacyChatList, open]);

    const generateTags = useCallback(()=>{
        let openList = [];
        fallacyNodes.forEach(e=>{openList.push(false)});
        // Always reset open array when fallacyNodes changes (e.g., switching cases)
        if (open.length !== fallacyNodes.length) {
            setOpen(openList);
        }
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
                // Use instanceKey (e.g., "BBS_0") to get instance-specific data
                const instanceKey = e.instanceKey;
                const fallacyData = fallacyChatList[instanceKey];
                // Skip if instance not in config
                if (!fallacyData) {
                    console.warn(`Instance "${instanceKey}" not found in config`);
                    return null;
                }
                const fallacyName = fallacyData.name;
                const fallacyColor = fallacyData.color;
                const fallacyIntroduction = fallacyData.explanation;
                const ifopen = fallacyData.open;
                const ftype = e.type[0];
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
                                            onClick={()=>handleLevelChange(instanceKey,'L3')}
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
                                dataSource={chatList[instanceKey]?.chatList || []}
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
                                        onClick={()=>handleLevelChange(instanceKey,'L2')}>
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
                                        onClick={()=>handleLevelChange(instanceKey,'L3')}>
                                        more &#8744;
                                    </Button>
                                    <Button
                                        type="dashed"
                                        size="small"
                                        onClick={()=>handleLevelChange(instanceKey,'L1')}>
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
                                        onClick={()=>handleLevelChange(instanceKey,'L2')}>
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
                                    onClick={()=>handleLevel3Change(instanceKey)}
                                    >Submit</Button>
                                    </Space>
                                </> 
                            }
                        </div>
                    </div>
                );
                return (
                    <div
                        key={"fdiv-"+e.id}
                        style={{
                            position: 'absolute',
                            top: e.top,
                            left: 0,
                            zIndex: ifopen ? 10 : 1,
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                    {/* Connector line and dot */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginRight: 0,
                    }}>
                        <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: fallacyColor,
                            opacity: ifopen ? 1 : 0.6,
                        }}/>
                        <div style={{
                            width: 40,
                            height: 2,
                            backgroundColor: fallacyColor,
                            opacity: ifopen ? 1 : 0.6,
                        }}/>
                    </div>
                    <Popover
                        key={"fallacyTagPop-"+e.id}
                        content={popContent}
                        placement="right"
                        trigger="click"
                        open={open[i]}
                        onOpenChange={()=>handleOpenChange(instanceKey, i)}
                    >
                    <Tooltip key={"fdiv-tooltip-"+e.id} title={
                        fallacyName === "Improper Criteria" && "This passage may attempt to deal with an issue by invoking aspects that aren't relevant or ignoring ones that are. Click for an explanation."
                        }>
                    <Tag
                    key={"ftag-"+e.id}
                    color={fallacyColor}
                    className={cx('underline_minimap', css`
                        cursor: pointer;
                        opacity: ${ifopen ? 1 : 0.6};
                    `)}
                    >
                        <b>{fallacyName}</b>
                    </Tag>
                    </Tooltip>
                    </Popover>
                    </div>
                );
            })}
        </>
    );
}