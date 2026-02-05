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
                const fallacyData = fallacyChatList[s.fallacy[0]];
                // Skip if fallacy type not in config
                if (!fallacyData) {
                    return(
                        <Text
                            id={i+"-news-sentence-"+paragraphID}
                            key={i+"-news-sentence-"+paragraphID}
                        >{s.sentence} </Text>
                    );
                }
                const fallacyName = fallacyData.name;
                const fallacyColor = fallacyData.color;
                const fallacyAbbrev = s.fallacy[0];
                const open = fallacyData.open;
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
                    background-color: ${fallacyData.rgbBG};
                    border-color: ${fallacyData.rgbBD};
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
                background-color: ${fallacyData.rgbBG};
                border-color: ${fallacyData.rgbBD};
                `
                //console.log(open);
                return(
                    <Tooltip title="click to see the detailed explanation" key={"Tootip"+i+paragraphID}>
                    <span id={i+"-news-sentence-"+paragraphID}
                    key={i+"-news-sentence-"+paragraphID}
                    data-fallacy={s.fallacy[0]}
                    data-sentence-index={s.index}
                    data-paragraph-index={paragraphID}
                    onClick={e=>handleSentenceClick(paragraphID, s.fallacy[0])}
                    className={
                        cx(inlineStyle)
                    }>
                        {s.sentence}
                    </span>
                    </Tooltip>
                );
            }else{
                // Filter to only fallacies that exist in config
                const validFallacies = s.fallacy.filter(fa => fallacyChatList[fa]);
                if (validFallacies.length === 0) {
                    return(
                        <Text
                            id={i+"-news-sentence-"+paragraphID}
                            key={i+"-news-sentence-"+paragraphID}
                        >{s.sentence} </Text>
                    );
                }
                const fallacyColor = validFallacies.map(fa=>fallacyChatList[fa]?.color || '#ccc');
                const activeFallacy = validFallacies.filter(fa=>fallacyChatList[fa]?.open === true);
                //console.log(activeFallacy);
                const activeData = activeFallacy.length > 0 ? fallacyChatList[activeFallacy[0]] : null;
                const inlineStyle = activeData ? css`
                    border-bottom: 2px solid ${fallacyColor[0]};
                    box-shadow:
                    0 2px 0 0px white,
                    0 5px 0 -1px ${fallacyColor[1] || fallacyColor[0]};
                    background-color: ${activeData.rgbBG};
                    border-color: ${activeData.rgbBD};
                `  : css`
                    border-bottom: 2px solid ${fallacyColor[0]};
                    box-shadow:
                    0 2px 0 0px white,
                    0 5px 0 -1px ${fallacyColor[1] || fallacyColor[0]};
                `;
                return(
                <Tooltip title="click the tag to see the explanation" key={"Tootip"+i+paragraphID}>
                    <span
                    id={i+"-news-sentence-"+paragraphID}
                    key={i+"-news-sentence-"+paragraphID}
                    data-fallacy={validFallacies.join(',')}
                    data-sentence-index={s.index}
                    data-paragraph-index={paragraphID}
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