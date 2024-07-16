import os
import json
import requests
import time

def load_api_key(file_path='../../cred.json'):
    """
    Load the API key from a JSON file.
    """
    with open(file_path, 'r') as file:
        creds = json.load(file)
        return creds.get('api_key')


def send_content_to_openai(content, model="gpt-4o", debug=False):
    """
    Send content to the OpenAI API and return the response.
    """
    api_key = load_api_key()
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    # Determine max_tokens based on model
    if model == "gpt-4o":
        max_tokens = 4096
    else:
        max_tokens = 4096

    # Craft the messages for the API request
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": f"""
Logical Fallacies List:
Personal attack: Attaching a person or group to avoid the issue.
Example: A politician discredits an opponent by criticizing their character instead of addressing the policy.
Who are you to talk?: Rejecting an argument because the person fails to practice what they preach.
Example: Ignoring climate change advice from a scientist with a high carbon footprint.
Ad hominem: Attacking the person or group rather than their argument.
Example: Dismissing someone's opinion on economic policy because they belong to a different political party.
Obfuscation/distraction: Diverting attention or confusing the reader.
Example: When asked about unemployment rates, a politician talks about education reform.
Strawman (Caricature): Distorting an opponent’s argument to attack a weakened version.
Example: Misrepresenting a proposal for universal healthcare as advocating for a government-controlled system.
Fallacy of composition/division (Part/whole confusion): Assuming what is true of the parts is true of the whole, or vice versa.
Example: Assuming that because each component of a machine is lightweight, the entire machine must be lightweight.
Red Herring (sidetracking): Sidetracking by raising an irrelevant issue.
Example: Shifting the debate on climate change to economic costs without addressing environmental impacts.
Appeal to emotion: Evoking irrelevant feelings to support an argument.
Example: Arguing against war by focusing on emotional stories of soldiers without addressing political implications.
Cherry Picking: Highlighting favorable cases while ignoring contradictory data.
Example: Highlighting positive testimonials about a product while ignoring negative reviews.
Vagueness: Obscuring the meaning of terms to avoid clear evaluation.
Example: A politician promises to "improve the economy" without specifying how.
Evading the Burden of Proof (EBP): Making a claim without providing evidence.
Example: A politician claims a new policy will improve the economy without supporting data.
Improper criteria: Invoking irrelevant aspects or ignoring relevant ones.
Example: Using an arbitrary date to claim that all innovations after it are irrelevant.
Appeal to authority (dubious authority): Relying on apparent authorities instead of genuine ones.
Example: A celebrity endorses a drug for heart health without medical expertise.
Bandwagon: Claiming something is true because many people believe it.
Example: Claiming a diet is effective because many people follow it.
Appeal to tradition: Arguing something is true because it has been believed for a long time.
Example: Insisting on a traditional remedy despite lack of scientific evidence.
Appeal to ignorance: Claiming something is true because it hasn’t been proven false.
Example: Claiming ghosts exist because no one has proven they do not.
Slippery slope: Arguing an innocent first step will lead to an undesirable chain of events.
Example: Arguing that legalizing a drug will lead to the legalization of all drugs.
Questionable conclusion: Drawing unwarranted conclusions.
Example: Concluding a policy is effective based on a single study without considering other evidence.
Begging the question: Assuming the premise is true to prove the conclusion.
Example: Claiming we must trust the government because it knows what is best for us.
Hasty generalization: Drawing a conclusion from a biased or small sample.
Example: Concluding all dogs are aggressive based on encountering a few aggressive dogs.
Post Hoc (PH): Assuming that because one event followed another, the first caused the second.
Example: Believing a lucky charm caused winning a game.
False Cause (FC): Mistaking correlation for causation.
Example: Asserting ice cream consumption causes drowning because both increase in summer.
Formal fallacies: Logical errors in deductive reasoning.
Example: All dogs are animals; some animals are cats; therefore, some dogs are cats.
Divide & Conquer: Drawing irrelevant distinctions or obscuring meaningful ones.
Example: Focusing on minor differences between policies to create division.
False dilemma/dichotomy: Presenting two options as the only possibilities.
Example: Claiming you must either support or oppose a policy without considering middle ground.
Decision point fallacy: Arguing that because we cannot identify a precise cut-off, there is no distinction.
Example: Arguing there is no distinction between youth and old age because we cannot pinpoint the exact moment someone becomes old.
Faulty analogy: Comparing things that are not similar in relevant respects.
Example: Comparing internet content regulation to book censorship without acknowledging differences.
Equivocation: Using a word in different senses within the same argument.
Example: Arguing that "fine for parking here" means it is okay to park here because "fine" can also mean acceptable.
Task: Identify logical fallacies in the given text using this list. Explain where the fallacy occurs and why. Output the information in the JSON format defined below.
{content}
        """}
    ]

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.7  # Adjust as needed
    }

    if debug:
        print(f"Debug: Would send payload to OpenAI API: {json.dumps(payload)[:500]}...")  # Print the first 500 characters
        return {"debug": "This is a debug response"}
    else:
        response = requests.post(url, headers=headers, json=payload)
        return response.json()


def send_content_to_backend(content, debug=False):
    if debug:
        # Placeholder for debugging, print the content instead of sending it
        print(f"Debug: Would send content to backend: {content[:100]}...")  # Print the first 100 characters
        return {"debug": "This is a debug response"}
    else:
        print("Sleeping 5 seconds.")
        time.sleep(5)
        response = send_content_to_openai(content, debug=debug)
        return response


def process_folder(folder_path, debug=False):
    json_file = os.path.join(folder_path, 'overview.json')

    if not os.path.isfile(json_file):
        print(f"No overview.json found in {folder_path}")
        return

    try:
        with open(json_file, 'r') as file:
            data = json.load(file)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from {json_file}: {e}")
        return

    for item in data:
        content_file = os.path.join(folder_path, item['content'])

        if not os.path.isfile(content_file):
            print(f"No content file found: {content_file}")
            continue

        with open(content_file, 'r') as file:
            content = file.read()

        response = send_content_to_backend(content, debug=debug)
        result_file = os.path.join(folder_path, f"{os.path.splitext(item['content'])[0]}_result.txt")

        with open(result_file, 'w') as file:
            json.dump(response, file, indent=2)


def main():
    base_directory = './'
    debug_mode = False  # Set to False to actually send to backend

    for folder_name in os.listdir(base_directory):
        folder_path = os.path.join(base_directory, folder_name)

        if os.path.isdir(folder_path):
            process_folder(folder_path, debug=debug_mode)


if __name__ == "__main__":
    main()
