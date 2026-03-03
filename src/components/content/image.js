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
  clickSentence, setClickSentence, imgSrc, imgOcr, imageFlag, hideAnnotations}){
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [domWidth, setDomWidth] = useState(600);
  const [domHeight, setDomHeight] = useState(332);
  const [scaleFactor, setScaleFactor] = useState(0);
  const [actualHeight, setActualHeight] = useState(332);
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

  const handleSentenceClick = (pid, instanceKey) => {
    //console.log(pid, instanceKey);
    // Extract fallacy code from instance key (e.g., "DIS_chart" -> "DIS")
    const fallacyCode = instanceKey.replace('_chart', '');
    setClickSentence({
        p_index: pid,
        fallacy: fallacyCode,
        isChart: true,
        instanceKey: instanceKey
    });
};

  const replaceOriginalImage = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const img = new Image();
    img.src = imgSrc;
    img.onload = (e) => {
      if (!canvasRef.current) return;
      const imgNaturalWidth = e.currentTarget.naturalWidth;
      const imgNaturalHeight = e.currentTarget.naturalHeight;
      // Scale to fit width while maintaining aspect ratio
      const scale_factor = domWidth / imgNaturalWidth;
      const newWidth = domWidth;
      const newHeight = imgNaturalHeight * scale_factor;
      // Update canvas dimensions to match scaled image
      canvasRef.current.width = newWidth;
      canvasRef.current.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      setScaleFactor(scale_factor);
      setActualHeight(newHeight);
    };
  },[imgSrc, domWidth]);

  const generateTags = useCallback(()=>{
    let flist = [];
    let openList = [];
    // Get unique fallacy codes from chart sources
    errSentence.forEach(e=>{
        e.chartSource.forEach(ee=>{
            // Use chart instance key (e.g., "DIS_chart")
            const instanceKey = `${ee}_chart`;
            !flist.includes(instanceKey) && flist.push(instanceKey);
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

  // Measure container width and handle resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Use full container width minus small padding
        setDomWidth(containerWidth - 20);
      }
    };

    // Small delay to ensure container is rendered
    const timer = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  useEffect(()=>{
    replaceOriginalImage();
  },[imgSrc, domWidth]);

    return(
      <div ref={containerRef} style={{height: actualHeight, marginBottom: 10, maxWidth: '100%', overflow: 'hidden'}}>
      <div id="canvas_container" style={{maxWidth: '100%', position: 'relative'}}>
        <div id="canvas_overlay" style={{maxWidth: '100%'}}>
          {(imageFlag && tagdom.length>0 && !hideAnnotations) && tagdom.map((e,i)=>{
            const fallacyData = fallacyChatList[e];
            // Skip if fallacy not in config
            if (!fallacyData) return null;
            const fallacyName = fallacyData.name;
            const fallacyColor = fallacyData.color;
            const fallacyIntroduction = fallacyData.explanation;
            const freason = fallacyData.reason;
            const frange = fallacyData.range;
            if (!frange) return null;
            //console.log(fallacyName, fallacyData.open);
            // Use full image width instead of scaled range
            const eWidth = domWidth - 10;
            const eHeight = actualHeight - 10; // Use actual image height minus small padding
            //const etop = i%2===0 ? 50 : 25;
            const inlineStyle = !fallacyData.open ? css`
            border: 2px dashed;
            border-color: ${fallacyColor};
            border-radius: .25rem;
            cursor: pointer;
            &:hover {
                border: 3px solid;
                background-color: ${fallacyData.rgbBG};
                border-color: ${fallacyData.rgbBD};
            }
            ` : css`
            border: 3px solid;
            border-color: ${fallacyColor};
            border-radius: .25rem;
            cursor: pointer;
            background-color: ${fallacyData.rgbBG};
            border-color: ${fallacyData.rgbBD};
            `;
            const fallacyExplanationPopContent = (
              <div style={{
                  width: 200
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
                      <Text><b>Chart-text Linkage: </b>{fallacyData.reason}</Text>
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
                          fallacyData.level==="L1" &&
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
                          fallacyData.level==="L2" &&
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
                          fallacyData.level==="L3" && 
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
                  top: 5,
                  left: 5,
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
                  height: eHeight
                }}></div>
                </Space.Compact>}

                {i%2!==0 &&
                <Space.Compact direction="vertical" >
                <div
                onClick={de=>handleSentenceClick(paragraphID, e)}
                className={cx(inlineStyle)} style={{
                  width: eWidth,
                  height: eHeight
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