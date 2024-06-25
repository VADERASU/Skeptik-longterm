import { useEffect, useCallback, useState, useRef } from "react";
import { Typography, Popover, Segmented, Flex, 
    Tooltip, Space, Button, Tag, Divider, List, Avatar } from "antd";
import {
    RedoOutlined,
    PushpinOutlined,
    MessageOutlined,
    UserOutlined,
    OpenAIOutlined
  } from '@ant-design/icons';
import * as Selection from 'selection-popover';
import { cx, css } from "@emotion/css";

export function Sentence({errSentence, setErrSentence, fallacyChatList, setFallacyChatList, 
paragraphID, setClickSentence}){
    const { Text } = Typography;

    const handleSentenceClick = (pid, fallacy) => {
        //console.log(pid, fallacy);
        setClickSentence({
            p_index: pid,
            fallacy: fallacy
        });
    };

    return(
        <>
        {errSentence.map((s,i)=>{
            if(s.fallacy.length === 0){ // no error
                return(
                    <Text 
                        id={i+"-news-sentence-"+paragraphID} 
                        key={i+"-news-sentence-"+paragraphID}
                    >{s.sentence} </Text>
                );
            }else if(s.fallacy.length === 1){
                const fallacyName = fallacyChatList[s.fallacy[0]].name;
                const fallacyColor = fallacyChatList[s.fallacy[0]].color;
                const fallacyAbbrev = s.fallacy[0];
                const open = fallacyChatList[fallacyAbbrev].open;
                const inlineStyle = !open ? css`
                padding-top: 1.5px;
                padding-bottom: 1.5px;
                padding-left: 6px;
                padding-right: 6px;
                border: 2px solid;
                border-color: ${fallacyColor};
                border-width: 0 0 2px 0;
                border-radius: .25rem;
                cursor: pointer;
                &:hover {
                    background-color: ${fallacyChatList[s.fallacy[0]].rgbBG};
                    border-color: ${fallacyChatList[s.fallacy[0]].rgbBD};
                }
                ` : css`
                padding-top: 1.5px;
                padding-bottom: 1.5px;
                padding-left: 6px;
                padding-right: 6px;
                border: 2px solid;
                border-color: ${fallacyColor};
                border-width: 0 0 2px 0;
                border-radius: .25rem;
                cursor: pointer;
                background-color: ${fallacyChatList[s.fallacy[0]].rgbBG};
                border-color: ${fallacyChatList[s.fallacy[0]].rgbBD};
                `
                //console.log(open);
                return(
                    <Tooltip title="click to see the detailed explanation" key={"Tootip"+i+paragraphID}>
                    <span id={i+"-news-sentence-"+paragraphID}
                    key={i+"-news-sentence-"+paragraphID}
                    onClick={e=>handleSentenceClick(paragraphID, s.fallacy[0])}
                    className={
                        cx(inlineStyle)
                    }>
                        {s.sentence} 
                    </span>
                    </Tooltip> 
                );
            }else{
                const fallacyColor = s.fallacy.map(fa=>fallacyChatList[fa].color);
                const activeFallacy = s.fallacy.filter(fa=>fallacyChatList[fa].open === true);
                //console.log(activeFallacy);
                const inlineStyle = activeFallacy.length>0 ? css`
                    border-bottom: 2px solid ${fallacyColor[0]};
                    box-shadow:
                    0 2px 0 0px white,
                    0 5px 0 -1px ${fallacyColor[1]};
                    background-color: ${fallacyChatList[activeFallacy[0]].rgbBG};
                    border-color: ${fallacyChatList[activeFallacy[0]].rgbBD};
                `  : css`
                    border-bottom: 2px solid ${fallacyColor[0]};
                    box-shadow:
                    0 2px 0 0px white,
                    0 5px 0 -1px ${fallacyColor[1]};
                `;
                return(
                <Tooltip title="click the tag to see the explanation" key={"Tootip"+i+paragraphID}>
                    <span 
                    id={"news-sentence-"+paragraphID+i}
                    key={"news-sentence-"+paragraphID+i}
                    className={cx(inlineStyle)}
                    >
                        {s.sentence} 
                    </span>
                </Tooltip>
                );
            }
        })}
        </>
    );
}