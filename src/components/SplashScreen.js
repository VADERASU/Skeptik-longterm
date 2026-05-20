import { useState } from "react";
import { Modal, Button, Typography } from "antd";

const { Paragraph, Text } = Typography;

export function SplashScreen({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [visible, setVisible] = useState(true);

    const handleOk = () => {
        if (currentStep === 1) {
            setCurrentStep(2);
        } else {
            setVisible(false);
            onComplete();
        }
    };

    const renderStep1 = () => (
        <div style={{ textAlign: "center", padding: "20px 40px" }}>
            <img
                src={process.env.PUBLIC_URL + "/img/skeptik logo.png"}
                alt="Skeptik Logo"
                style={{ width: 150, marginBottom: 30 }}
            />
            <Paragraph style={{ fontSize: 18, textAlign: "left" }}>
                Skeptik uses artificial intelligence to flag possible fallacies
                (errors in reasoning) in text appearing on a web page.
            </Paragraph>
            <Paragraph style={{ fontSize: 18, textAlign: "left" }}>
                AI can make mistakes, so Skeptik only suggests where there{" "}
                <Text strong>may be</Text> a fallacy and what kind it is.
            </Paragraph>
            <Paragraph style={{ fontSize: 18, textAlign: "left" }}>
                It is important that you re-examine the text and decide for
                yourself whether it is right.
            </Paragraph>
        </div>
    );

    const renderStep2 = () => (
        <div style={{ textAlign: "center", padding: "20px 40px" }}>
            <img
                src={process.env.PUBLIC_URL + "/img/skeptik_example.png"}
                alt="Skeptik Example"
                style={{ width: "100%", maxWidth: 700, marginBottom: 30, border: "1px solid #ddd", borderRadius: 8 }}
            />
            <Paragraph style={{ fontSize: 22, textAlign: "left" }}>
                When you see highlighted text, Skeptik shows you the category of fallacy
                it thinks is present.
            </Paragraph>
            <Paragraph style={{ fontSize: 22, textAlign: "left" }}>
                When you click the text, it shows a more detailed explanation of the
                fallacy it thinks is present. Clicking the text again will hide the explanation.
            </Paragraph>
            <Paragraph style={{ fontSize: 22, textAlign: "left" }}>
                We recommend that you read the explanation, then read the text again to
                see if you think it fits the explanation.
            </Paragraph>
            <Paragraph style={{ fontSize: 22, textAlign: "left" }}>
                <Text strong>Important:</Text> Please keep your head still while reading
                and use only your eyes to look around the screen.
            </Paragraph>
        </div>
    );

    return (
        <Modal
            open={visible}
            footer={null}
            closable={false}
            centered
            width={currentStep === 1 ? 600 : 800}
        >
            {currentStep === 1 ? renderStep1() : renderStep2()}
            <div style={{ textAlign: "center", marginTop: 20, marginBottom: 20 }}>
                <Button
                    type="primary"
                    size="large"
                    onClick={handleOk}
                    style={{
                        backgroundColor: "#3d5a6c",
                        borderColor: "#3d5a6c",
                        minWidth: 120,
                        height: 45,
                        fontSize: 16
                    }}
                >
                    OK
                </Button>
            </div>
        </Modal>
    );
}
