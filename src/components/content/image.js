import { useEffect, useCallback, useState, useRef } from "react";
import { Tag, Space, Popover, Flex, Typography, 
    Tooltip, Button, Divider, List, Avatar, Input, Row, Col } from "antd";
import { cx, css } from "@emotion/css";
import {
    RedoOutlined,
    PushpinOutlined,
    MessageOutlined,
    UserOutlined,
    OpenAIOutlined,
    FundViewOutlined
} from '@ant-design/icons';

export function FallacyImage({errSentence, paragraphID, fallacyChatList, setFallacyChatList, 
  clickSentence, setClickSentence, imgSrc, imgOcr, imageFlag}){
  const canvasRef = useRef(null);
  const [domWidth, setDomWidth] = useState(800); //900
  const [domHeight, setDomHeight] = useState(332); //432
  const [scaleFactor, setScaleFactor] = useState(0);
  const [tagdom, setTagdom] = useState([]);
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

  const handleLevel3Change = (ftype) => {
      //console.log(textAreaValue, ftype);
      const newChat = JSON.parse(JSON.stringify(fallacyChatList));
      const newClist = newChat[ftype].chatList
      
      newClist.push({
          role: "user",
          content: textAreaValue
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
    setFallacyChatList({
        ...fallacyChatList,
        [ftype]: {
            ...fallacyChatList[ftype],
            open: nextopen[index]
        }
    });
  };

  const handleSentenceClick = (pid, fallacy) => {
    //console.log(pid, fallacy);
    setClickSentence({
        p_index: pid,
        fallacy: fallacy
    });
};

  const replaceOriginalImage = useCallback(() => {
    const ctx = canvasRef.current.getContext("2d");
    const img = new Image();
    img.src = imgSrc;
    img.onload = (e) => {
      canvasRef.current.width = domWidth;
      canvasRef.current.height = domHeight;
      //console.log(e.currentTarget, e.currentTarget.naturalWidth);
      const imgNaturalWidth = e.currentTarget.naturalWidth;
      const imgNaturalHeight = e.currentTarget.naturalHeight;
      const scale_factor = Math.min(domWidth / imgNaturalWidth, domHeight / imgNaturalHeight);
      const newWidth = imgNaturalWidth * scale_factor;
      const newHeight = imgNaturalHeight * scale_factor;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      //console.log('Image Canvas created!');
      setScaleFactor(scale_factor);
    };
  },[imgSrc]);

  const generateTags = useCallback(()=>{
    let flist = [];
    let openList = [];
    errSentence.forEach(e=>{
        e.chartSource.forEach(ee=>{
            !flist.includes(ee) && flist.push(ee);
        });
    });
    flist.forEach((e,i)=>openList.push(false));
    setTagdom(flist);
    open.length === 0 && setOpen(openList);
    //console.log(flist);
  },[errSentence]);

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
  },[errSentence]);
  
  useEffect(()=>{
    genChatList();
  },[fallacyChatList]);

  useEffect(()=>{
    replaceOriginalImage();
  },[imgSrc]);
//console.log("imageFlag", imageFlag);
    return(
      <div style={{height: domHeight, marginBottom: 10}}>
      <div id="canvas_container">
        <div id="canvas_overlay">
          {(imageFlag && tagdom.length>0) && tagdom.map((e,i)=>{
            const fallacyName = fallacyChatList[e].name;
            const fallacyColor = fallacyChatList[e].color;
            const fallacyIntroduction = fallacyChatList[e].explanation;
            const freason = fallacyChatList[e].reason;
            const frange = fallacyChatList[e].range;
            //console.log(fallacyName, fallacyChatList[e].open);
            const eWidth = frange[1]*scaleFactor - frange[0]*scaleFactor;
            const eHeight = 270; //360 -> 315
            //const etop = i%2===0 ? 50 : 25;
            const inlineStyle = !fallacyChatList[e].open ? css`
            border: 2px dashed;
            border-color: ${fallacyColor};
            border-radius: .25rem;
            cursor: pointer;
            &:hover {
                border: 3px solid;
                background-color: ${fallacyChatList[e].rgbBG};
                border-color: ${fallacyChatList[e].rgbBD};
            }
            ` : css`
            border: 3px solid;
            border-color: ${fallacyColor};
            border-radius: .25rem;
            cursor: pointer;
            background-color: ${fallacyChatList[e].rgbBG};
            border-color: ${fallacyChatList[e].rgbBD};
            `;
            const fallacyExplanationPopContent = (
              <div style={{
                  width: 200
              }}><Space direction="vertical" size="small">
                  <Text>{fallacyIntroduction}</Text>
                  {fallacyChatList[e].wiki !== "" && 
                  <Link href={fallacyChatList[e].wiki} target="_blank">
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
                  width: 380,
              }}>
                  <Row>
                      <Col span={18}>
                          <Popover content={fallacyExplanationPopContent}>
                              <Text strong style={{
                                  color: fallacyColor,
                                  marginTop: 1
                              }}>{fallacyName}</Text>
                          </Popover>
                      </Col>
                      <Col span={6}>
                          <Space.Compact style={{marginLeft: 100, float: "right"}}>
                              <Tooltip title="Requery LLM for the explanation">
                                  <Button style={{padding: 2, height: "27px"}} icon={<RedoOutlined style={{ fontSize: '12px' }} />} />
                              </Tooltip>
                              <Tooltip title="Chat with LLM for further information">
                                  <Button style={{padding: 2, height: "27px"}} icon={<MessageOutlined style={{ fontSize: '12px' }} />} />
                              </Tooltip>
                              <Tooltip title="Pin the window">
                                  <Button style={{padding: 2, height: "27px"}} icon={<PushpinOutlined style={{ fontSize: '12px' }} />} />
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
                      <Text><b>Chart-text Linkage: </b>{fallacyChatList[e].reason}</Text>
                      <Divider style={{marginTop: 5, marginBottom: 2}} />
                      <List
                          size="small"
                          dataSource={chatList[e].chatList}
                          renderItem={(item, index)=>{
                              return <List.Item>
                                  <List.Item.Meta
                                      avatar={
                                          <Avatar 
                                              size="small" 
                                              icon={<OpenAIOutlined />} 
                                          />
                                      }
                                      title={item.role}
                                  />
                                  {item.content}
                              </List.Item>
                          }}
                      />
                      {
                          fallacyChatList[e].level==="L1" && 
                          <Divider plain style={{marginTop: 2}}>
                              <Space size="small">
                                  Show
                              <Button 
                                  type="dashed" 
                                  size="small" 
                                  onClick={()=>handleLevelChange(e,'L2')}>
                                  more &#8744;
                              </Button>
                              explanation
                              </Space> 
                          </Divider>
                      }
                      {
                          fallacyChatList[e].level==="L2" && 
                          <Divider plain style={{marginTop: 2}}>
                              <Space size="small">
                              Show
                              <Button 
                                  type="dashed" 
                                  size="small" 
                                  onClick={()=>handleLevelChange(e,'L3')}>
                                  more &#8744;
                              </Button>
                              <Button 
                                  type="dashed" 
                                  size="small" 
                                  onClick={()=>handleLevelChange(e,'L1')}>
                                  less &#8743;
                              </Button>
                              explanation
                              </Space>  
                          </Divider>
                      }
                      {
                          fallacyChatList[e].level==="L3" && 
                          <>
                          <Divider plain style={{marginTop: 2}}>
                              
                              <Button 
                                  type="dashed" 
                                  size="small" 
                                  onClick={()=>handleLevelChange(e,'L2')}>
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
                              onClick={()=>handleLevel3Change(e)}
                              >Submit</Button>
                              </Space>
                          </> 
                      }
                  </div>
              </div>
            );

            return(
              <div
                style={{
                  position: "absolute",
                  //backgroundColor: fallacyColor,
                  top: 25,
                  left: frange[0]*scaleFactor,
                }}
                
                key={"overlay-div-"+i}
              >
                {i%2===0 && 
                <Space.Compact direction="vertical" >
                  <Space.Compact>
                  {/*<Popover 
                        content={popContent} 
                        placement="right" 
                        trigger="click"
                        open={open[i]}
                        onOpenChange={()=>handleOpenChange(e, i)}
                    >
                  <Tag 
                  color={fallacyColor} 
                  className={cx('underline_minimap', css`
                    cursor: pointer;
                    height: 20px;
                    font-size: 11px;
                  `)}
                  >   
                  <b>{fallacyName}</b>
                </Tag>
                </Popover>
                <FundViewOutlined style={{fontSize: 20}} />*/}
                  </Space.Compact>
                <div 
                onClick={de=>handleSentenceClick(paragraphID, e)}
                className={cx(inlineStyle)} style={{
                  width: eWidth,
                  height: eHeight+25
                }}></div>
                </Space.Compact>}

                {i%2!==0 && 
                <Space.Compact direction="vertical" >
                <div
                onClick={de=>handleSentenceClick(paragraphID, e)}
                className={cx(inlineStyle)} style={{
                  width: eWidth,
                  height: eHeight+25
                }}></div>
                  {/*<Space.Compact>
                  <Popover 
                        content={popContent} 
                        placement="right" 
                        trigger="click"
                        open={open[i]}
                        onOpenChange={()=>handleOpenChange(e, i)}
                    >
                    <Tag 
                    color={fallacyColor} 
                    className={cx('underline_minimap', css`
                      cursor: pointer;
                      height: 20px;
                      font-size: 11px;
                    `)}
                    >   
                    <b>{fallacyName}</b>
                  </Tag>
                    </Popover>
                  <FundViewOutlined style={{fontSize: 20}} />
            </Space.Compact>*/}
                </Space.Compact>}
              
              </div>
            );
          })}
        </div>
        <canvas ref={canvasRef} />
      </div>
      </div>
      
    );


  }