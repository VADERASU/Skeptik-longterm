import {useEffect, useState} from "react";
import { Select, Button } from "antd";

export function NavBar ({caselist, setSelectedCase, activeArticle}) {
    
    return(
        <>
            <span className="logo" href="#"
                style={{float: 'left'}}
            >
                Skeptik
            </span>

            <Select 
                defaultValue={0}
                size="small"
                options={caselist}
                onChange={e=>setSelectedCase(e)}
                style={{
                    width: 600,
                    float: 'left',
                    marginTop: 10
                }}
            />

            <span
                style={{
                    float: 'left', color: "white", lineHeight: 3,
                    marginLeft: 20
                }}
            >
                <b>Case Title: {activeArticle.title}</b>
            </span>

        </>
    );
}